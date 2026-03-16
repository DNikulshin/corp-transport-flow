-- DropColumn: удаление мёртвого поля online из vehicles.
-- Поле дублировало isActive, но управлялось через REST-эндпоинты,
-- которые mobile-приложение никогда не вызывало.
ALTER TABLE "vehicles" DROP COLUMN "online";
