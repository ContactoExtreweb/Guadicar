-- Unifica cómo están escritas las marcas (VOLKSWAGEN / Volkswagen -> Volkswagen)
-- con la misma lista que usa el formulario (src/lib/marcas.js).
-- ESTADO: pendiente. Se puede ejecutar en cualquier momento.

-- 1) Ver cómo están ahora
select marca, count(*) from public.vehiculos group by marca order by marca;

-- 2) Unificar (solo toca las que no están ya bien escritas)
update public.vehiculos v
set marca = m.oficial
from (values
  ('abarth','Abarth'), ('alfaromeo','Alfa Romeo'), ('astonmartin','Aston Martin'), ('audi','Audi'), ('bentley','Bentley'), ('bmw','BMW'), ('byd','BYD'), ('chevrolet','Chevrolet'), ('chrysler','Chrysler'), ('citroen','Citroën'), ('cupra','Cupra'), ('dacia','Dacia'), ('dodge','Dodge'), ('ds','DS'), ('ferrari','Ferrari'), ('fiat','Fiat'), ('ford','Ford'), ('honda','Honda'), ('hyundai','Hyundai'), ('infiniti','Infiniti'), ('isuzu','Isuzu'), ('iveco','Iveco'), ('jaguar','Jaguar'), ('jeep','Jeep'), ('kia','Kia'), ('lamborghini','Lamborghini'), ('lancia','Lancia'), ('landrover','Land Rover'), ('lexus','Lexus'), ('lynkco','Lynk & Co'), ('maserati','Maserati'), ('mazda','Mazda'), ('mercedesbenz','Mercedes-Benz'), ('mg','MG'), ('mini','Mini'), ('mitsubishi','Mitsubishi'), ('nissan','Nissan'), ('omoda','Omoda'), ('opel','Opel'), ('peugeot','Peugeot'), ('polestar','Polestar'), ('porsche','Porsche'), ('renault','Renault'), ('seat','SEAT'), ('skoda','Skoda'), ('smart','Smart'), ('ssangyong','SsangYong'), ('subaru','Subaru'), ('suzuki','Suzuki'), ('tesla','Tesla'), ('toyota','Toyota'), ('volkswagen','Volkswagen'), ('volvo','Volvo'), ('vw','Volkswagen'), ('mercedes','Mercedes-Benz'), ('alfa','Alfa Romeo')
) as m(clave, oficial)
where regexp_replace(translate(lower(v.marca), 'áéíóúëüñ', 'aeioueun'), '[^a-z0-9]', '', 'g') = m.clave
  and v.marca is distinct from m.oficial
returning v.slug, v.marca;

-- 3) Volver a ejecutar la consulta 1: si queda alguna rara (una errata como
--    "Wolkvagen"), corregirla a mano desde el panel.
