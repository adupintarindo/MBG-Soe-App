-- ============================================================================
-- Seed data · MBG Soe
-- Port dari Dashboard_SupplyChain_MBG_Soe.html (SCHOOLS, SUPPLIERS ringkas)
-- Jalankan SETELAH 0001..0003. Untuk dev local / first deploy.
-- ============================================================================

-- ---- SCHOOLS (9 sekolah cluster Soe) --------------------------------------
insert into public.schools(id,name,level,students,kelas13,kelas46,guru,distance_km,pic,phone,address) values
 ('SCH-01','PAUD FETO MONE','PAUD/TK',45,0,0,5,1.0,'Kepala PAUD FETO MONE','+62 852-3700-1101','Kota Soe · TTS'),
 ('SCH-02','PAUD GENERASI UNGGUL','PAUD/TK',19,0,0,3,1.2,'Kepala PAUD Generasi Unggul','+62 852-3700-1102','Kota Soe · TTS'),
 ('SCH-03','PAUD TALENTA','PAUD/TK',14,0,0,4,1.4,'Kepala PAUD Talenta','+62 852-3700-1103','Kota Soe · TTS'),
 ('SCH-04','SD INPRES KOBELETE','SD',372,188,184,16,2.1,'Kepala SD Inpres Kobelete','+62 813-3700-2201','Kobelete · TTS'),
 ('SCH-05','SD INPRES NUNUMEU','SD',405,212,193,26,0.4,'Kepala SD Inpres Nunumeu','+62 813-3700-2202','Jl. Nunumeu · Kota Soe'),
 ('SCH-06','SD NEGERI OEKLANI','SD',76,39,37,4,3.6,'Kepala SD Negeri Oeklani','+62 813-3700-2203','Oeklani · TTS'),
 ('SCH-07','SMP KRISTEN 1 SOE','SMP',252,0,0,7,1.8,'Kepala SMP Kristen 1 Soe','+62 812-3700-3301','Kota Soe · TTS'),
 ('SCH-08','SMA NEGERI 1 SOE','SMA',859,0,0,33,2.0,'Kepala SMA Negeri 1 Soe','+62 812-3700-3302','Jl. Soekarno-Hatta · Soe'),
 ('SCH-09','SMK CAHAYA LENTERA','SMK',13,0,0,7,2.5,'Kepala SMK Cahaya Lentera','+62 812-3700-3303','Kota Soe · TTS')
on conflict (id) do update set
  students=excluded.students, kelas13=excluded.kelas13, kelas46=excluded.kelas46,
  guru=excluded.guru, distance_km=excluded.distance_km;

-- ---- ITEMS (subset · tambahkan sesuai master di HTML) ---------------------
-- Karbohidrat
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Beras Putih','White Rice','kg','BERAS',14000,450),
 ('Fortification Rice','Fortified Rice','kg','BERAS',16000,0),
 ('Kentang','Potato','kg','UMBI',18000,85),
 ('Ubi Jalar','Sweet Potato','kg','UMBI',12000,40)
on conflict (code) do nothing;

-- Protein hewani
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Ayam Segar','Fresh Chicken','kg','HEWANI',45000,170),
 ('Telur Ayam','Chicken Egg','kg','HEWANI',32000,90),
 ('Ikan Tuna','Tuna','kg','HEWANI',55000,60),
 ('Ikan Tongkol','Skipjack','kg','HEWANI',42000,50),
 ('Ikan Kembung','Mackerel','kg','HEWANI',38000,40),
 ('Daging Sapi','Beef','kg','HEWANI',130000,20)
on conflict (code) do nothing;

-- Protein nabati
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Tahu','Tofu','kg','NABATI',12000,60),
 ('Tempe','Tempeh','kg','NABATI',14000,55)
on conflict (code) do nothing;

-- Sayur
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Wortel','Carrot','kg','SAYUR',15000,70),
 ('Buncis','Green Bean','kg','SAYUR',18000,40),
 ('Kacang Panjang','Long Bean','kg','SAYUR',16000,35),
 ('Bayam','Spinach','kg','SAYUR_HIJAU',12000,55),
 ('Sawi Hijau','Mustard Greens','kg','SAYUR_HIJAU',13000,50),
 ('Kangkung','Water Spinach','kg','SAYUR_HIJAU',10000,40),
 ('Labu Siam','Chayote','kg','SAYUR',9000,25),
 ('Jagung Manis','Sweet Corn','kg','SAYUR',14000,30)
on conflict (code) do nothing;

-- Bumbu & Rempah
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Bawang Merah','Shallot','kg','BUMBU',38000,20),
 ('Bawang Putih','Garlic','kg','BUMBU',42000,18),
 ('Cabai Merah','Red Chili','kg','BUMBU',55000,10),
 ('Jahe','Ginger','kg','REMPAH',25000,8),
 ('Kunyit','Turmeric','kg','REMPAH',22000,6),
 ('Garam','Salt','kg','SEMBAKO',8000,12),
 ('Gula Pasir','Sugar','kg','SEMBAKO',16000,15),
 ('Minyak Goreng','Cooking Oil','lt','SEMBAKO',18000,40),
 ('Kecap Manis','Sweet Soy','lt','SEMBAKO',28000,8)
on conflict (code) do nothing;

-- Buah
insert into public.items(code,name_en,unit,category,price_idr,vol_weekly) values
 ('Buah - Pisang','Banana','kg','BUAH',12000,80),
 ('Buah - Pepaya','Papaya','kg','BUAH',10000,60),
 ('Buah - Melon','Melon','kg','BUAH',18000,40),
 ('Buah - Semangka','Watermelon','kg','BUAH',9000,70),
 ('Buah - Jeruk','Orange','kg','BUAH',22000,50)
on conflict (code) do nothing;

-- ---- MENUS (14-day cycle ringkas · tambah BOM nanti via UI) ---------------
insert into public.menus(id,name,name_en,cycle_day) values
 (1,'Nasi Ayam Wortel Jagung','Rice w/ Chicken & Veg',1),
 (2,'Nasi Ikan Tuna Tumis Sayur','Rice w/ Tuna & Stir-fry',2),
 (3,'Nasi Telur Balado Buncis','Rice w/ Egg Balado & Green Bean',3),
 (4,'Nasi Ikan Kembung Kangkung','Rice w/ Mackerel & Water Spinach',4),
 (5,'Nasi Ayam Kecap Bayam','Rice w/ Soy Chicken & Spinach',5),
 (6,'Nasi Tahu Tempe Sawi','Rice w/ Tofu-Tempeh & Mustard',6),
 (7,'Nasi Ikan Tongkol Labu Siam','Rice w/ Skipjack & Chayote',7),
 (8,'Nasi Telur Dadar Wortel','Rice w/ Omelette & Carrot',8),
 (9,'Nasi Ayam Goreng Kacang Panjang','Rice w/ Fried Chicken & Long Bean',9),
 (10,'Nasi Daging Cincang Sayur Asem','Rice w/ Minced Beef & Veg Soup',10),
 (11,'Nasi Ikan Tuna Bumbu Kuning','Rice w/ Yellow Tuna',11),
 (12,'Nasi Ayam Sayur Lodeh','Rice w/ Chicken & Coconut Veg',12),
 (13,'Nasi Tahu Rica Sawi','Rice w/ Spicy Tofu & Mustard',13),
 (14,'Nasi Ikan Kembung Bayam','Rice w/ Mackerel & Spinach',14)
on conflict (id) do nothing;

-- ---- SIMPLIFIED BOM (gram per porsi) ---------------
-- NOTE: nilai ini placeholder; validasi dengan ahli gizi sebelum go-live.
insert into public.menu_bom(menu_id,item_code,grams_per_porsi) values
 (1,'Beras Putih',100),(1,'Ayam Segar',45),(1,'Wortel',30),(1,'Jagung Manis',25),(1,'Minyak Goreng',5),(1,'Bawang Merah',3),(1,'Bawang Putih',2),(1,'Garam',1),(1,'Buah - Pisang',80),
 (2,'Beras Putih',100),(2,'Ikan Tuna',50),(2,'Kangkung',35),(2,'Bawang Putih',2),(2,'Cabai Merah',1),(2,'Minyak Goreng',5),(2,'Buah - Pepaya',80),
 (3,'Beras Putih',100),(3,'Telur Ayam',55),(3,'Buncis',35),(3,'Cabai Merah',2),(3,'Bawang Merah',3),(3,'Minyak Goreng',5),(3,'Buah - Melon',80),
 (4,'Beras Putih',100),(4,'Ikan Kembung',50),(4,'Kangkung',35),(4,'Bawang Putih',2),(4,'Minyak Goreng',5),(4,'Buah - Semangka',80),
 (5,'Beras Putih',100),(5,'Ayam Segar',45),(5,'Bayam',35),(5,'Kecap Manis',5),(5,'Bawang Putih',2),(5,'Minyak Goreng',5),(5,'Buah - Jeruk',80),
 (6,'Beras Putih',100),(6,'Tahu',40),(6,'Tempe',30),(6,'Sawi Hijau',35),(6,'Bawang Merah',3),(6,'Kecap Manis',3),(6,'Minyak Goreng',5),(6,'Buah - Pisang',80),
 (7,'Beras Putih',100),(7,'Ikan Tongkol',50),(7,'Labu Siam',35),(7,'Bawang Putih',2),(7,'Minyak Goreng',5),(7,'Buah - Pepaya',80),
 (8,'Beras Putih',100),(8,'Telur Ayam',55),(8,'Wortel',30),(8,'Bawang Merah',3),(8,'Minyak Goreng',5),(8,'Buah - Melon',80),
 (9,'Beras Putih',100),(9,'Ayam Segar',45),(9,'Kacang Panjang',35),(9,'Bawang Putih',2),(9,'Minyak Goreng',6),(9,'Buah - Semangka',80),
 (10,'Beras Putih',100),(10,'Daging Sapi',35),(10,'Wortel',25),(10,'Kacang Panjang',20),(10,'Bawang Merah',3),(10,'Bawang Putih',2),(10,'Garam',1),(10,'Buah - Jeruk',80),
 (11,'Beras Putih',100),(11,'Ikan Tuna',50),(11,'Kunyit',1),(11,'Jahe',1),(11,'Bawang Merah',3),(11,'Minyak Goreng',5),(11,'Buncis',30),(11,'Buah - Pisang',80),
 (12,'Beras Putih',100),(12,'Ayam Segar',45),(12,'Labu Siam',25),(12,'Wortel',20),(12,'Bawang Merah',3),(12,'Bawang Putih',2),(12,'Minyak Goreng',5),(12,'Buah - Pepaya',80),
 (13,'Beras Putih',100),(13,'Tahu',50),(13,'Sawi Hijau',35),(13,'Cabai Merah',3),(13,'Bawang Merah',3),(13,'Minyak Goreng',5),(13,'Buah - Melon',80),
 (14,'Beras Putih',100),(14,'Ikan Kembung',50),(14,'Bayam',35),(14,'Bawang Putih',2),(14,'Minyak Goreng',5),(14,'Buah - Semangka',80)
on conflict (menu_id,item_code) do nothing;

-- ---- SUPPLIERS (12 · hasil Vendor Matrix) ----------------------------------
insert into public.suppliers(id,name,type,commodity,pic,phone,address,email,notes,score,status) values
 ('SUP-01','Bulog NTT','BUMN','Beras medium, Beras premium','Kepala Bulog NTT','+62 380-821-833','Kupang · NTT','bulog.ntt@bulog.co.id','Backbone beras · 14.323 kg Mar-Jun · ⏳ LTA awaiting sign',87.6,'awaiting'),
 ('SUP-02','CV Lintas Cakrawala','CV','Ayam segar, Telur ayam, Ikan Tuna, Ikan Tongkol, Ikan Kembung','Direktur CV Lintas Cakrawala','+62 812-3888-1100','Kupang · NTT','info@lintascakrawala.co.id','Protein hewani utama',82.3,'signed'),
 ('SUP-03','UD Kurnia Jaya','UD','Kentang, Wortel, Buncis, Kacang Panjang, Bawang Merah, Bawang Putih','Pemilik UD Kurnia Jaya','+62 813-3801-2202','Soe · TTS','kurniajaya.soe@gmail.com','Sayur & bumbu segar',78.1,'signed'),
 ('SUP-04','Koperasi Fetomone','KOPERASI','Sayur hijau, Bayam, Sawi, Kangkung','Ketua Koperasi Fetomone','+62 852-3700-4401','Soe · TTS','koperasi.fetomone@gmail.com','Produk lokal petani',74.5,'signed'),
 ('SUP-05','UD Buah Sehat','UD','Buah - Pisang, Buah - Pepaya, Buah - Melon, Buah - Semangka, Buah - Jeruk','Pemilik UD Buah Sehat','+62 813-3801-5503','Kupang · NTT','buahsehat.nt@gmail.com','Buah segar harian',79.2,'signed'),
 ('SUP-06','CV Rajawali Pangan','CV','Tahu, Tempe, Minyak goreng, Gula, Garam','Direktur CV Rajawali','+62 812-3888-6601','Kupang · NTT','rajawali@gmail.com','Sembako & nabati',76.0,'signed'),
 ('SUP-07','Poktan Tunas Harapan','POKTAN','Jagung manis, Labu siam, Ubi jalar','Ketua Poktan Tunas Harapan','+62 852-3700-7703','Oeklani · TTS','poktan.tunas@gmail.com','Petani lokal',71.2,'signed'),
 ('SUP-08','Toko Sumber Rejeki','TOKO','Cabai, Jahe, Kunyit, Lengkuas, Sereh, Ketumbar','Pemilik Toko Sumber Rejeki','+62 813-3801-8804','Soe · TTS','sumberejeki.soe@gmail.com','Bumbu & rempah',72.8,'signed'),
 ('SUP-09','PT Nutri Fortifikasi','PT','Fortification rice','GM PT Nutri Fortifikasi','+62 21-555-9901','Jakarta','info@nutrifortifikasi.co.id','Fortification rice khusus MBG',80.5,'signed'),
 ('SUP-10','CV Mandiri Daging','CV','Daging sapi','Direktur CV Mandiri Daging','+62 812-3888-1010','Kupang · NTT','mandiridaging@gmail.com','Daging sapi mingguan',77.4,'signed'),
 ('SUP-11','Glory Supplier','CV','—','—','—','—','—','❌ Rejected (Vendor Matrix score <70)',58.0,'rejected'),
 ('SUP-12','Kios Louis','KIOS','—','—','—','—','—','❌ Rejected (non-compliant)',52.0,'rejected')
on conflict (id) do nothing;

-- supplier_items map (contoh untuk item utama)
insert into public.supplier_items(supplier_id,item_code,is_main,price_idr) values
 ('SUP-01','Beras Putih',true,14000),
 ('SUP-02','Ayam Segar',true,45000),
 ('SUP-02','Telur Ayam',true,32000),
 ('SUP-02','Ikan Tuna',true,55000),
 ('SUP-02','Ikan Tongkol',true,42000),
 ('SUP-02','Ikan Kembung',true,38000),
 ('SUP-03','Kentang',true,18000),
 ('SUP-03','Wortel',true,15000),
 ('SUP-03','Buncis',true,18000),
 ('SUP-03','Kacang Panjang',true,16000),
 ('SUP-03','Bawang Merah',true,38000),
 ('SUP-03','Bawang Putih',true,42000),
 ('SUP-04','Bayam',true,12000),
 ('SUP-04','Sawi Hijau',true,13000),
 ('SUP-04','Kangkung',true,10000),
 ('SUP-05','Buah - Pisang',true,12000),
 ('SUP-05','Buah - Pepaya',true,10000),
 ('SUP-05','Buah - Melon',true,18000),
 ('SUP-05','Buah - Semangka',true,9000),
 ('SUP-05','Buah - Jeruk',true,22000),
 ('SUP-06','Tahu',true,12000),
 ('SUP-06','Tempe',true,14000),
 ('SUP-06','Minyak Goreng',true,18000),
 ('SUP-06','Gula Pasir',true,16000),
 ('SUP-06','Garam',true,8000),
 ('SUP-06','Kecap Manis',true,28000),
 ('SUP-07','Jagung Manis',true,14000),
 ('SUP-07','Labu Siam',true,9000),
 ('SUP-07','Ubi Jalar',true,12000),
 ('SUP-08','Cabai Merah',true,55000),
 ('SUP-08','Jahe',true,25000),
 ('SUP-08','Kunyit',true,22000),
 ('SUP-09','Fortification Rice',true,16000),
 ('SUP-10','Daging Sapi',true,130000)
on conflict (supplier_id,item_code) do nothing;

-- Opening stock (kosong sementara; operator input via UI sebelum go-live)

-- ---- MENU_ASSIGN go-live (14-day cycle dari 2026-05-04) --------------------
-- Mon=1 Tue=2 ... skip weekend; auto 14-day rotation
do $$
declare
  d date;
  i int := 0;
  m smallint := 1;
begin
  d := date '2026-05-04';
  while d < date '2026-07-31' loop
    if extract(dow from d) not in (0,6) then
      insert into public.menu_assign(assign_date, menu_id)
      values (d, m)
      on conflict (assign_date) do nothing;
      m := m + 1; if m > 14 then m := 1; end if;
      i := i + 1;
    end if;
    d := d + 1;
  end loop;
end $$;
