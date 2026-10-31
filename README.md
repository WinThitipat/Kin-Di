# กินดิ! — KIN DI

เว็บช่วยเลือกเมนูเวลาคิดไม่ออกว่าจะกินอะไร ลองสุ่มไพ่ หรือเลือกวัตถุดิบในตู้เย็นแล้วดูเมนูที่เข้ากันได้

**[เปิดเว็บ](https://kin-di.vercel.app)** · **[GitHub ของผู้พัฒนา](https://github.com/WinThitipat)**

## ทำอะไรได้บ้าง

- สุ่มเมนูผ่านไพ่ พร้อม filter มื้ออาหาร หมวดอาหาร และเวลาทำ
- ค้นเมนูจากวัตถุดิบที่มี ดูทั้งเมนูที่ครบและเมนูที่ยังขาดของอีกเล็กน้อย
- เพิ่มวัตถุดิบใหม่ลงฐานข้อมูลส่วนกลางได้จากช่องค้นหา
- เก็บสูตรผ่านฟอร์ม 4 ขั้น มีร่างในเครื่องและหน้าตรวจสอบก่อนเซฟ
- ค้นหา แชร์ และเปิดดูสูตรที่บันทึกไว้ การแก้ไขและลบใช้ PIN ผู้ดูแล
- เก็บเมนูโปรดและตั้งข้อจำกัดทางอาหาร

ระบบเลือกเมนูใช้กฎและการ match วัตถุดิบ ไม่ได้เรียกโมเดล AI มาแนะนำอาหาร ข้อมูลการแพ้ใช้ช่วยกรองเบื้องต้น ผู้ใช้ยังต้องตรวจส่วนผสม ฉลาก และความเสี่ยงปนเปื้อนก่อนรับประทาน

## Tech stack

| ส่วน | เทคโนโลยี |
| --- | --- |
| Frontend และ API | Next.js App Router, React, TypeScript |
| Styling | Tailwind CSS, CSS, IBM Plex Sans Thai, Lucide |
| Validation | Zod |
| Database | Supabase PostgreSQL และ RPC |
| รูปอาหาร | Sharp, Supabase Storage และ Edge Function |
| Hosting | Vercel เชื่อม GitHub |
| Testing | Vitest และสคริปต์ Playwright |

เวอร์ชันที่ติดตั้งจริงดูได้จาก `package-lock.json`

## รันในเครื่อง

ใช้ Node.js ที่รองรับ Next.js 15 (แนะนำ Node.js 22 LTS) และ npm

```bash
git clone https://github.com/WinThitipat/Kin-Di.git
cd Kin-Di
npm ci
```

คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าของโปรเจกต์ตนเอง:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
RECIPE_SERVER_SECRET=YOUR_RANDOM_SERVER_SECRET
ADMIN_DELETE_PIN_HASH=YOUR_SCRYPT_HASH
```

| ตัวแปร | ใช้ทำอะไร |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL ของ Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | API key สำหรับ client ตามชื่อที่โค้ดใช้อยู่ ห้ามใช้ service-role key ในตัวแปรนี้ |
| `RECIPE_SERVER_SECRET` | Secret ฝั่ง server ต้องตรงกับ SHA-256 digest ใน `private.kindi_server_config` |
| `ADMIN_DELETE_PIN_HASH` | PIN ผู้ดูแลในรูปแบบ salted scrypt hash ใช้กับการแก้ไขและลบสูตร |

อย่า commit `.env.local`, PIN จริง หรือ server secret และอย่าเติม `NEXT_PUBLIC_` ให้ตัวแปรลับ

เปิด development server:

```bash
npm run dev
```

เข้า `http://localhost:3000` หรือกำหนดพอร์ตเองด้วย `npm run dev -- --port 3100`

ถ้ายังไม่ได้ตั้งฐานข้อมูล หน้าเว็บเปิดได้ แต่การอ่านและบันทึกข้อมูลจะไม่ครบ ระบบไม่ได้ใช้รายการสูตรในเครื่องแทนเมื่อ database ล้มเหลว

## ตั้งค่า Supabase

สำหรับโปรเจกต์ใหม่ ต้องเตรียมมากกว่าค่า URL และ API key:

1. ใช้ SQL migrations ใน [`supabase/migrations`](supabase/migrations) ตามลำดับไฟล์ เพื่อตั้งตาราง RPC และสิทธิ์การเข้าถึง
2. สร้าง server secret แบบสุ่มอย่างน้อย 32 ตัวอักษร เก็บค่าจริงใน environment ของ Next.js และใส่ SHA-256 digest ของค่าเดียวกันใน `private.kindi_server_config.token_hash` โดยใช้สิทธิ์ผู้ดูแลฐานข้อมูล
3. สร้าง hash ของ PIN ตัวเองด้วย `hashAdminPin` ใน [`src/lib/admin-pin.server.ts`](src/lib/admin-pin.server.ts) แล้วเก็บใน `ADMIN_DELETE_PIN_HASH` ไม่เก็บ PIN เป็น plain text
4. ตั้งค่าและ deploy Edge Function [`recipe-image-upload`](supabase/functions/recipe-image-upload/index.ts) สำหรับอัปโหลดรูป ตรวจให้มี bucket `recipe-images` และ environment ฝั่ง function ที่จำเป็นตามโค้ด
5. ทดสอบอ่านสูตร เพิ่มสูตรพร้อมรูป และเปิดข้อมูลจาก browser อีกตัวก่อนใช้งานจริง

รายละเอียดโครงสร้างและประวัติการตั้งค่าอยู่ใน [`docs/database-setup.md`](docs/database-setup.md) เอกสารนั้นอ้างถึงโปรเจกต์เดิม บางส่วนเป็นบันทึกการพัฒนาก่อนเปลี่ยนมาใช้ shared rate limiter จึงควรตรวจ migrations และโค้ดปัจจุบันประกอบ ไม่คัดลอก credential หรือค่าของผู้ดูแลเดิมมาใช้

## ข้อมูลเก็บที่ไหน

| ข้อมูล | ที่เก็บ |
| --- | --- |
| สูตรอาหารที่เซฟ | `public.community_recipes` ใน PostgreSQL |
| วัตถุดิบส่วนกลางที่เพิ่มใหม่ | `private.kindi_ingredients` ผ่าน API และ RPC ที่ตรวจ server secret |
| รูปอาหารที่บันทึก | Supabase Storage bucket `recipe-images` |
| เมนูโปรด ข้อจำกัด ของที่เลือกในตู้เย็น และร่างฟอร์ม | `localStorage` ของ browser |

ข้อมูลส่วนตัวใน browser ยังไม่ sync ข้ามอุปกรณ์ และยังไม่มีระบบ login ส่วนบุคคล

## โครงสร้างโปรเจกต์

```text
src/app/                 หน้าเว็บและ API routes
src/components/          Navbar, dialogs และ component ที่ใช้ร่วมกัน
src/features/            ระบบสุ่มและกฎคัดกรอง/จับคู่อาหาร
src/lib/                 Repository, database, validation helpers และ storage
src/types/               Types และ Zod schemas
src/data/                วัตถุดิบพื้นฐานและข้อมูลประกอบ
supabase/migrations/     SQL migrations
supabase/functions/      Edge Function อัปโหลดรูป
scripts/                 Browser regression checks และเครื่องมือพัฒนา
docs/                    เอกสารระบบและรายงาน audit
public/                  รูป ฟอนต์ และ static assets
```

## ตรวจงาน

```bash
npm run lint
npm test
npm run build
npm start
```

`lint` ในโปรเจกต์นี้เรียก TypeScript ผ่าน `tsc --noEmit` ส่วน `npm start` ต้องรันหลัง build แล้ว

Browser regression ใช้ Playwright กับ Chrome ตัวอย่างเทสที่จำลอง API และไม่ใช้ PIN จริง:

```bash
node scripts/verify-community-field-errors.cjs
node scripts/verify-delete-dialog-pending.cjs
```

กำหนด `TEST_BASE_URL` เป็น URL ของ server ที่เปิดไว้ สองสคริปต์นี้ใช้พอร์ตเริ่มต้นต่างกัน และเทส dialog จำกัด host เป็น localhost ถ้าทดสอบ local ไม่ต้องเปิดเว็บ production

สคริปต์เดิมบางตัวอ้างพาธ Playwright ของเครื่องผู้พัฒนา ต้องปรับพาธหรือใช้ `PLAYWRIGHT_MODULE` ในไฟล์ที่รองรับก่อนรันบนเครื่องอื่น อ่านสคริปต์ก่อนใช้ เพราะมี integration tests บางตัวที่เชื่อม Supabase และอาจสร้างหรือ archive ข้อมูลจริง ไม่ควรรันทุกไฟล์ใน `scripts/` กับ production พร้อมกัน

## Deploy

เชื่อม repository กับ Vercel และตั้ง environment variables ให้ครบใน environment ที่ต้องการใช้งาน โปรเจกต์ปัจจุบันเชื่อม branch `main` กับ production จึงเกิด deployment อัตโนมัติเมื่อ push เข้า branch นี้

Supabase migrations และ Edge Function ต้องจัดการแยกจาก Next.js deployment การ deploy หน้าเว็บไม่ได้ตั้งค่าฐานข้อมูลให้เอง

## ข้อจำกัด

- การตรวจด้วย viewport จำลองยังไม่ครอบคลุมอุปกรณ์และ browser ทุกชนิด
- ยังไม่มีผล load test หรือ penetration test เต็มรูปแบบ จึงไม่อ้างว่ารองรับโหลดสูงหรือป้องกัน DDoS ได้ทุกกรณี
- สูตรบางรายการเก็บเพียงข้อมูลสรุปและลิงก์ ต้องเปิดวิธีทำฉบับเต็มจากต้นฉบับ

## เครดิต

โปรเจกต์โดย **[WinThitipat](https://github.com/WinThitipat)**

รูปและเนื้อหาสูตรที่อ้างจากภายนอกเป็นของเจ้าของต้นฉบับ เครดิตรูปที่เก็บในโปรเจกต์ดูที่ [`public/images/CREDITS.md`](public/images/CREDITS.md) ฟอนต์ IBM Plex Sans Thai ใช้ตาม [SIL Open Font License](public/fonts/OFL.txt)

ขอบคุณโครงการ open source ที่ใช้พัฒนา รายการ dependencies อยู่ใน `package.json` และ `package-lock.json`
