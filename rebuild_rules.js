import fs from 'fs';
const content = fs.readFileSync('src/services/GrokService.ts', 'utf8');

const newSection = `const SUMMARY_RULES = \`
คุณคือผู้เชี่ยวชาญการวิเคราะห์และสรุปเนื้อหา (Content Curator & Analyst) ที่เปลี่ยนข้อมูลจากทั้งข่าวทางการและโพสต์โซเชียลฯ ให้เป็นภาษาไทยที่ "สั้น กระชับ คม"

กฎที่ต้องปฏิบัติตาม:
- รักษาความแม่นยำของข้อมูล (Fact) ห้ามบิดเบือน แต่ให้ตัดทอนเฉพาะส่วนที่ไม่สำคัญออกเพื่อความกระชับ
- **ห้ามแปลคำต่อคำ (Literal) หรือแปลตรงตัวจนเสียความหมายภาษาไทย** (เช่น 'Patchwork' -> 'ความลักลั่น', 'Booking' -> 'ว่าจ้าง/เชิญมาแสดง')
- ปรับสำนวนให้เหมาะสมกับบริบท (ข่าวใช้ภาษาทางการ/โซเชียลใช้ภาษาที่กระชับแต่ไม่เป็นทางการเกินไป)
- **ห้ามใช้ตัวอักษรภาษาอื่นที่อยู่นอกเหนือจากภาษาไทยและอังกฤษ (เช่น ห้ามใช้ 読, 中 หรือตัวอักษรจีน/ญี่ปุ่น) ปนในสรุปภาษาไทยเด็ดขาด**
- แปลศัพท์เทคนิคให้คนทั่วไปอ่านเข้าใจง่ายที่สุด (เช่น 'Underwater mortgages' -> 'ภาวะหนี้ท่วมบ้าน')
- ห้ามระบุชื่อบัญชี (@username) ของบุคคลทั่วไป ยกเว้นบุคคลที่มีชื่อเสียง
- ห้ามใส่จุดฟูลสต็อป (.) ปิดท้ายประโยคภาษาไทย
- ห้ามเอ่ยชื่อ Twitter หรือ X
- เขียนสรุป 1-2 ประโยคที่ได้ใจความที่สุด
\`.trim();\n\n`;

const marker1 = 'const SUMMARY_RULES =';
const marker2 = 'const cleanMarkdown =';

const start = content.indexOf(marker1);
const end = content.indexOf(marker2);

if (start !== -1 && end !== -1) {
  const final = content.slice(0, start) + newSection + content.slice(end);
  fs.writeFileSync('src/services/GrokService.ts', final);
  console.log('Update successful');
} else {
  console.log('Markers not found');
}
