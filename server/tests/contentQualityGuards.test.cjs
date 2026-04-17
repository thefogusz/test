const test = require('node:test');
const assert = require('node:assert/strict');

const loadGuards = () => import('../../src/services/contentQualityGuards.js');

test('flags repeated publisher attribution overuse', async () => {
  const { hasPublisherAttributionOveruse } = await loadGuards();
  const sample = [
    'Dexerto รายงานว่ายอดผู้เล่นลดลงแรงในเดือนเดียวบน Steam',
    'หลังจากนั้น Dexerto ก็อ้างข้อมูลเดิมซ้ำอีกครั้งจนเนื้อหาดูพิงแหล่งข่าวเกินไป',
  ].join('\n\n');

  assert.equal(hasPublisherAttributionOveruse(sample), true);
});

test('flags source-led narrative across multiple paragraphs', async () => {
  const { hasSourceLedNarrative } = await loadGuards();
  const sample = [
    'Dexerto รายงานว่ายอดผู้เล่นหายไปเกือบ 80 เปอร์เซ็นต์ในเดือนเดียว',
    'ต่อมา Dexerto โพสต์กราฟ drop ซ้ำอีกรอบ ทำให้ย่อหน้าทั้งชิ้นเล่าตามสำนักข่าวแทนที่จะเล่าประเด็นเอง',
    'ตอนจบยังวนกลับไปอ้าง Steam Charts แบบไม่มีมุมเพิ่ม',
  ].join('\n\n');

  assert.equal(hasSourceLedNarrative(sample), true);
});

test('flags weak data-dump opening for short viral content', async () => {
  const { hasWeakDataDumpOpening } = await loadGuards();
  const sample =
    'ARC Raiders พีคผู้เล่นพร้อมกัน 466,372 คนบน Steam ต้นมกราคม 2569 แต่แค่เดือนถัดมา ยอดดิ่งเหลือ 80,000-90,000 คนเท่านั้น สูญเสียผู้เล่นเกือบ 80 เปอร์เซ็นต์เต็มๆ';

  assert.equal(
    hasWeakDataDumpOpening(sample, { format: 'โพสต์โซเชียล', tone: 'กระตือรือร้น/ไวรัล' }),
    true,
  );
});

test('adaptive directives for viral social avoid forced hooks', async () => {
  const { buildAdaptiveWritingDirectives } = await loadGuards();
  const directives = buildAdaptiveWritingDirectives({
    format: 'โพสต์โซเชียล',
    tone: 'กระตือรือร้น/ไวรัล',
    length: 'short',
    customInstructions: '',
    rawUserInput: 'เขียนโพสต์สั้นให้อ่านหยุด',
  });

  assert.match(directives, /Do not force a question hook or theatrical teaser/);
  assert.match(directives, /write like a real person posting with intent/i);
});
