-- 03_parts_fitments.sql — a few sample parts across the launch categories, plus sample
-- fitments. Part numbers here are illustrative seed data for development only.
insert into public.parts (part_number, brand, category, description) values
  ('87139-0K080', 'Toyota',  'AC',                 'Cabin air filter'),
  ('88568-0K010', 'Toyota',  'AC',                 'AC compressor clutch'),
  ('90915-YZZE1', 'Toyota',  'engine_consumables', 'Oil filter'),
  ('17801-0C010', 'Toyota',  'engine_consumables', 'Air filter element'),
  ('AB39-9601-AA','Ford',    'engine_consumables', 'Air filter (Ranger)'),
  ('6C11-9176-AA','Ford',    'body',               'Front bumper bracket'),
  ('6Q0129620',   'Volkswagen','engine_consumables','Air filter (Polo)'),
  ('16546-ED000', 'Nissan',  'engine_consumables', 'Air filter (NP200)'),
  ('8-98140-266-0','Isuzu',  'engine_consumables', 'Oil filter (D-Max)')
on conflict (brand, part_number) do nothing;

-- Sample fitments (illustrative): link a couple of parts to vehicles.
insert into public.fitments (vehicle_id, part_id, position, source, confidence)
select v.id, p.id, null, 'seed:sample', 0.900
from public.vehicles v
join public.parts p on p.brand = 'Toyota' and p.part_number = '90915-YZZE1'
where v.make = 'Toyota' and v.model = 'Corolla'
on conflict do nothing;

insert into public.fitments (vehicle_id, part_id, position, source, confidence)
select v.id, p.id, null, 'seed:sample', 0.880
from public.vehicles v
join public.parts p on p.brand = 'Ford' and p.part_number = 'AB39-9601-AA'
where v.make = 'Ford' and v.model = 'Ranger'
on conflict do nothing;
