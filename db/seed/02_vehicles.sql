-- 02_vehicles.sql — launch vehicle set for Eswatini / South Africa.
insert into public.vehicles (make, model, year_range, engine) values
  ('Toyota',    'Hilux',         '2005-2015', '2.5 D-4D'),
  ('Toyota',    'Hilux',         '2016-2024', '2.8 GD-6'),
  ('Toyota',    'Quantum',       '2005-2024', '2.5 D-4D'),
  ('Toyota',    'Corolla',       '2008-2019', '1.6 Petrol'),
  ('Toyota',    'Fortuner',      '2016-2024', '2.8 GD-6'),
  ('Toyota',    'Hiace',         '2005-2024', '2.5 D-4D'),
  ('Toyota',    'Land Cruiser',  '2008-2024', '4.5 D-4D'),
  ('Toyota',    'Etios',         '2012-2020', '1.5 Petrol'),
  ('Ford',      'Ranger',        '2011-2022', '3.2 TDCi'),
  ('Ford',      'Figo',          '2010-2018', '1.4 Petrol'),
  ('Volkswagen','Polo',          '2010-2017', '1.6 Petrol'),
  ('Volkswagen','Polo Vivo',     '2010-2024', '1.4 Petrol'),
  ('Nissan',    'NP200',         '2008-2024', '1.6 Petrol'),
  ('Nissan',    'NP300 Hardbody','2008-2024', '2.5 Diesel'),
  ('Nissan',    'Almera',        '2013-2020', '1.5 Petrol'),
  ('Isuzu',     'D-Max',         '2013-2024', '2.5 Diesel'),
  ('Isuzu',     'KB',            '2008-2016', '2.5 Diesel'),
  ('Hyundai',   'H100',          '2008-2024', '2.6 Diesel'),
  ('Kia',       'K2700',         '2008-2022', '2.7 Diesel'),
  ('Mahindra',  'Bolero',        '2012-2022', '2.5 Diesel')
on conflict do nothing;
