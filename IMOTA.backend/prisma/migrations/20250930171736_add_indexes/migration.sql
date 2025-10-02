create index if not exists ride_completedat_idx on "Ride" ("completedAt");
create index if not exists ride_createdat_idx on "Ride" ("createdAt");
create index if not exists payment_createdat_idx on "Payment" ("createdAt");
create index if not exists driverlocation_updatedat_idx on "DriverLocation" ("updatedAt");
