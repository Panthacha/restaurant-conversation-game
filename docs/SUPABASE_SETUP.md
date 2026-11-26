# ตั้งค่า Supabase และ Login ด้วย Google

ระบบ Login, Dashboard, Ranking และหน้าหลังบ้านของครูเก็บข้อมูลใน [Supabase](https://supabase.com) (มีแพ็กเกจฟรี)
ถ้ายังไม่ตั้งค่า เกมยังเล่นได้ในโหมดผู้เยี่ยมชม โดยความก้าวหน้าเก็บไว้ในเบราว์เซอร์เครื่องนั้นเท่านั้น

ใช้เวลาประมาณ 20–30 นาที ทำตามลำดับนี้

## 1. สร้างโปรเจกต์ Supabase

1. สมัครและเข้าสู่ระบบที่ supabase.com แล้วกด **New project**
2. ตั้งชื่อ (เช่น `restaurant-game`) ตั้งรหัสผ่านฐานข้อมูล แล้วเลือก Region ใกล้ไทย (เช่น Singapore)
3. รอจนโปรเจกต์สร้างเสร็จ

## 2. สร้างตารางในฐานข้อมูล

1. ในเมนูซ้ายเลือก **SQL Editor** → **New query**
2. คัดลอกข้อความทั้งหมดในไฟล์ `supabase/schema.sql` มาวาง แล้วกด **Run**
3. ควรขึ้นว่า Success ถ้าแก้ไฟล์นี้ภายหลัง ก็รันซ้ำได้ ข้อมูลเดิมจะไม่หาย

ไฟล์นี้สร้างตาราง `profiles`, `level_attempts`, `practice_results`, `test_results`, `content`
พร้อมกฎความปลอดภัย: นักเรียนเห็นเฉพาะข้อมูลของตัวเอง ส่วนครูเห็นของทุกคน

## 3. สร้าง Google OAuth Client

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com) แล้วสร้างโปรเจกต์ใหม่ (หรือใช้โปรเจกต์เดิม)
2. **APIs & Services → OAuth consent screen** ตั้งชื่อแอป ใส่อีเมลติดต่อ แล้วเลือก User type เป็น **External**
   (ถ้าใช้ Google Workspace ของโรงเรียน เลือก Internal ได้ จะมีแค่บัญชีโรงเรียนที่เข้าได้)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000` และ URL จริงของเว็บ (เช่น `https://your-app.vercel.app`)
   - Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
     (คัดลอก URL นี้ได้จากหน้า Google provider ของ Supabase ในขั้นที่ 4)
4. กด Create แล้วเก็บ **Client ID** และ **Client secret** ไว้

## 4. เปิด Google Login ใน Supabase

1. Supabase → **Authentication → Sign In / Providers → Google** → เปิด Enable
2. วาง Client ID และ Client secret จากขั้นที่ 3 แล้วกด Save
3. **Authentication → URL Configuration**
   - Site URL: URL จริงของเว็บ (ตอนทดสอบในเครื่องใช้ `http://localhost:3000`)
   - Redirect URLs: เพิ่ม `http://localhost:3000/**` และ `https://your-app.vercel.app/**`

## 5. ใส่คีย์ในโปรเจกต์

1. Supabase → **Project Settings → API Keys**
   คัดลอก **Project URL** และ **Publishable key** (ขึ้นต้นด้วย `sb_publishable_`; จะใช้ anon key แบบเดิมก็ได้)
2. คัดลอกไฟล์ `.env.example` เป็น `.env.local` แล้วใส่ค่า:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

3. หยุด `npm run dev` แล้วเปิดใหม่ หน้า Login จะมีปุ่ม "เข้าสู่ระบบด้วย Google"

`.env.local` ไม่ถูก commit ขึ้น GitHub ส่วน Publishable key เป็นคีย์สาธารณะที่ใช้ในเบราว์เซอร์ได้
ความปลอดภัยของข้อมูลมาจากกฎใน `schema.sql` **ห้ามใส่ secret key หรือ service_role key ในไฟล์นี้เด็ดขาด**

## 6. ตั้งครูคนแรกเป็นผู้ดูแล

1. ครูเข้าเกมแล้ว Login ด้วย Google หนึ่งครั้ง (ระบบจะสร้างโปรไฟล์ให้)
2. Supabase → SQL Editor รันคำสั่งนี้ (เปลี่ยนเป็นอีเมลของครู):

   ```sql
   update public.profiles set role = 'admin' where email = 'teacher@example.com';
   ```

3. รีเฟรชหน้าเกม เมนูหลักจะมีปุ่ม **TEACHER** ให้เข้าหน้าหลังบ้าน
   ครูคนถัดไปเพิ่มสิทธิ์ได้จากหน้าหลังบ้าน (แท็บนักเรียน → เลือกชื่อ → "ให้สิทธิ์ครู/ผู้ดูแล")

## 7. Deploy บน Vercel (ถ้าต้องการ)

1. Vercel → Project → **Settings → Environment Variables** เพิ่มสองค่าเดียวกับ `.env.local`
2. Deploy ใหม่ (ค่า `NEXT_PUBLIC_` ถูกฝังตอน build จึงต้อง build ใหม่หลังเปลี่ยนค่า)
3. อย่าลืมเพิ่ม URL ของ Vercel ใน Google (ขั้นที่ 3) และใน Supabase Redirect URLs (ขั้นที่ 4)

## หน้าหลังบ้านทำอะไรได้บ้าง

| แท็บ | ใช้ทำอะไร |
|---|---|
| ภาพรวม | จำนวนนักเรียน, ผล Pre/Post-test เฉลี่ยแยกตามทักษะ, ดาวเฉลี่ยของแต่ละร้าน, อัตราตอบสุภาพ, ข้อสอบที่ตอบผิดมากที่สุด |
| นักเรียน | ตารางคะแนนทุกคน กดชื่อเพื่อดูรายละเอียดและบทสนทนาทุกครั้ง (เลือกตอบ/พูดตอบ/พิมพ์ตอบ/ใช้ตัวช่วย) ให้สิทธิ์ครู หรือให้ทำแบบทดสอบใหม่ |
| อันดับ | อันดับทั้งหมดหรือแยกห้อง |
| จัดการโจทย์ | เพิ่ม แก้ ลบ หรือคืนค่าโจทย์ Pre-test, Post-test และแบบฝึก |
| จัดการบทสนทนา | แก้ประโยคลูกค้า คำตอบ คะแนนอารมณ์ คำแนะนำภาษา คำศัพท์ และเมนูที่ต้องทำ พร้อมตรวจความถูกต้องก่อนบันทึก |

การแก้ไขของครูเก็บในตาราง `content` และใช้แทนต้นฉบับใน `data/` ทันที
กด "กลับเป็นต้นฉบับ" เมื่อต้องการยกเลิกการแก้ไข

## ข้อจำกัดที่ควรรู้

- คะแนนคำนวณในเบราว์เซอร์แล้วส่งไปบันทึก ฐานข้อมูลตรวจได้แค่ว่าค่าอยู่ในช่วงที่เป็นไปได้ จึงพอสำหรับใช้ในห้องเรียน แต่ไม่ใช่ระบบกันโกงเต็มรูปแบบ
- ระบบเก็บชื่อ อีเมล Google และห้องเรียนของนักเรียน ควรแจ้งนักเรียนและผู้ปกครองตามนโยบายของโรงเรียน
