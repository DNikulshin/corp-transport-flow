import React, { useState, useEffect, useRef, useCallback } from "react";
import MapView, { type Region } from "react-native-maps";
import { StyleSheet, View, Alert, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { useAuth } from "@/shared/hooks/use-auth";
import { useVehiclesSse } from "@/shared/hooks/use-vehicles-sse";
import { useVehiclesStore } from "@/shared/stores/vehicles-store";
import { LOCATION_TASK_NAME, closeTrackingWs } from "@/tasks/location-tracking";
import { api } from "@/shared/api";
import { colors } from "@/shared/constants/theme";

import { TopBar } from "./TopBar";
import { ProfileMenu } from "./ProfileMenu";
import { VehicleMarker } from "./VehicleMarker";
import { VehiclePopup } from "./VehiclePopup";
import { ShiftButton } from "./ShiftButton";
import { OfflineBanner } from "./OfflineBanner";
import { VehiclesList } from "./VehiclesList";

// Импорт регистрации задачи (side-effect)
import "@/tasks/location-tracking";

const MOSCOW: Region = {
  latitude: 55.751244,
  longitude: 37.618423,
  latitudeDelta: 0.3,
  longitudeDelta: 0.3,
};

export default function MapScreen() {
  const { user, logout } = useAuth();
  const isDriver = user?.role === "driver";

  const [isShiftActive, setIsShiftActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [vehiclesListOpen, setVehiclesListOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const hasCenteredRef = useRef(false);
  const mapRef = useRef<MapView>(null);

  // SSE — получаем позиции всех машин
  useVehiclesSse();

  // vehiclesList — кешированный массив в стейте (стабильная ссылка).
  const vehicles = useVehiclesStore((s) => s.vehiclesList);
  const setVehicleOnline = useVehiclesStore((s) => s.setVehicleOnline);
  const setVehicleOffline = useVehiclesStore((s) => s.setVehicleOffline);
  const storeUpdatePosition = useVehiclesStore((s) => s.updatePosition);

  // Запросить разрешения при старте
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ошибка", "Доступ к геолокации запрещён");
      }
    })();
  }, []);

  // Центрировать на своей машине — один раз, когда данные загрузятся
  useEffect(() => {
    if (hasCenteredRef.current || !user?.vehicleId) return;
    const myVehicle = vehicles.find((v) => v.id === user.vehicleId);
    if (myVehicle?.position && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: myVehicle.position.lat,
          longitude: myVehicle.position.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      );
      hasCenteredRef.current = true;
    }
  }, [vehicles, user?.vehicleId]);

  // --- Обработчики ---

  const handleToggleShift = useCallback(async () => {
    if (isShiftActive) {
      // 1. Останавливаем фоновую задачу GPS
      try {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      } catch {}
      // 2. Закрываем WS — бэкенд получит close-событие
      closeTrackingWs();
      // 3. Явный HTTP-вызов: удаляет позицию из Redis и публикует vehicle_offline в SSE.
      await api.post("/tracking/offline").catch(() => {});
      // 4. Обновляем стор напрямую, не ждём SSE (SSE может идти с задержкой).
      if (user?.vehicleId) setVehicleOffline(user.vehicleId);
      setIsShiftActive(false);
      return;
    }

    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== "granted") {
      Alert.alert(
        "Нет доступа",
        "Для фоновой отправки GPS нужно разрешение на геолокацию в фоне. Разрешите в настройках.",
      );
      return;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 5_000,
      distanceInterval: 10,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "КорпТранспорт",
        notificationBody: "Трансляция GPS активна",
        notificationColor: "#0ea5e9",
      },
    });

    // Получаем текущую позицию; если не удалось — пробуем последнюю известную.
    const initialPos =
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }).catch(() => null)) ??
      (await Location.getLastKnownPositionAsync().catch(() => null));

    const posPayload = initialPos
      ? {
          lat: initialPos.coords.latitude,
          lng: initialPos.coords.longitude,
          heading: initialPos.coords.heading ?? 0,
          speed: initialPos.coords.speed
            ? Math.round(initialPos.coords.speed * 3.6)
            : 0,
          timestamp: initialPos.timestamp,
        }
      : null;

    await api.post("/tracking/online", posPayload ?? {}).catch(() => {});

    // Обновляем стор напрямую — маркер появляется сразу, не ожидая SSE.
    if (user?.vehicleId) {
      setVehicleOnline(user.vehicleId);
      if (posPayload) {
        storeUpdatePosition({ vehicleId: user.vehicleId, ...posPayload });
      }
    }

    // Центрируем карту на текущей позиции водителя
    if (initialPos) {
      mapRef.current?.animateToRegion(
        {
          latitude: initialPos.coords.latitude,
          longitude: initialPos.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        600,
      );
      hasCenteredRef.current = true;
    }

    setIsShiftActive(true);
  }, [isShiftActive, user?.vehicleId, setVehicleOnline, setVehicleOffline, storeUpdatePosition]);

  const handleSelectVehicle = useCallback((vehicleId: string) => {
    setSelectedVehicleId((prev) => (prev === vehicleId ? null : vehicleId));
  }, []);

  const handleFocusVehicle = useCallback((lat: number, lng: number) => {
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  }, []);

  const handleMenuToggle = useCallback(() => {
    setVehiclesListOpen(false);
    setMenuOpen((v) => !v);
  }, []);

  const handleVehiclesToggle = useCallback(() => {
    setMenuOpen(false);
    setVehiclesListOpen((v) => !v);
  }, []);

  const handleVehicleFromList = useCallback(
    (vehicleId: string) => {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      if (vehicle?.position) {
        handleFocusVehicle(vehicle.position.lat, vehicle.position.lng);
      }
    },
    [vehicles, handleFocusVehicle],
  );

  const handleLogout = useCallback(() => {
    setMenuOpen(false);
    logout();
  }, [logout]);

  // --- Производные данные ---

  const activeCount = vehicles.filter((v) => v.isActive).length;
  const selectedVehicle = selectedVehicleId
    ? (vehicles.find((v) => v.id === selectedVehicleId) ?? null)
    : null;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Карта */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={MOSCOW}
        showsUserLocation={false}
        userInterfaceStyle="dark"
        showsCompass={false}
        showsScale={false}
      >
        {vehicles.map((vehicle) => (
          <VehicleMarker
            key={vehicle.id}
            vehicle={vehicle}
            isOwn={user?.vehicleId === vehicle.id}
            isSelected={selectedVehicleId === vehicle.id}
            onPress={handleSelectVehicle}
          />
        ))}
      </MapView>

      {/*
        UI-обёртка поверх карты.
        pointerEvents="box-none" — сама View не перехватывает тачи,
        но дочерние элементы получают события нормально.
        elevation: 10 — на Android поднимает выше нативного слоя MapView,
        что позволяет TouchableOpacity внутри получать тачи.
      */}
      <View style={styles.uiOverlay} pointerEvents="box-none">
        {/* Верхняя панель */}
        <SafeAreaView style={styles.topBarArea} edges={["top"]}>
          <TopBar
            activeCount={activeCount}
            userName={user?.fullName ?? ""}
            vehiclesOpen={vehiclesListOpen}
            onVehiclesPress={handleVehiclesToggle}
            onProfilePress={handleMenuToggle}
          />
        </SafeAreaView>

        {/* Список ТС — дропдаун под счётчиком */}
        <VehiclesList
          vehicles={vehicles}
          visible={vehiclesListOpen}
          onClose={() => setVehiclesListOpen(false)}
          onSelect={handleVehicleFromList}
        />

        {/* Меню профиля */}
        <ProfileMenu
          fullName={user?.fullName ?? ""}
          role={user?.role ?? "employee"}
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          onLogout={handleLogout}
        />

        {/* Баннер оффлайна */}
        <OfflineBanner />

        {/* Кнопка водителя */}
        {isDriver && !selectedVehicle && (
          <ShiftButton isActive={isShiftActive} onToggle={handleToggleShift} />
        )}

        {/* Попап выбранной машины */}
        {selectedVehicle && (
          <VehiclePopup
            vehicle={selectedVehicle}
            onClose={() => setSelectedVehicleId(null)}
            onFocus={handleFocusVehicle}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  map: { ...StyleSheet.absoluteFillObject },
  // Единый слой поверх карты. elevation поднимает выше MapView на Android.
  // pointerEvents="box-none" задаётся инлайн (JSX prop), не через StyleSheet.
  uiOverlay: {
    ...StyleSheet.absoluteFillObject,
    elevation: 10,
    zIndex: 10,
  },
  topBarArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});
