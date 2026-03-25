import { buildSearchPlan } from 'file:///d:/Work/FORO-MOCK/test/src/services/GrokService.js';

async function test() {
  console.log("--- Testing search plan for 'คริปโต' ---");
  const plan = await buildSearchPlan("คริปโต");
  console.log(JSON.stringify(plan, null, 2));
}

test();
