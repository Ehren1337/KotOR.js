import { expect, test } from '@jest/globals';
import { NWScriptDataType } from '@/enums/nwscript/NWScriptDataType';
import type { NWScript } from '@/nwscript/NWScript';
import type { NWScriptInstruction } from '@/nwscript/NWScriptInstruction';
import { OP_CONST, OP_CPDOWNSP, OP_MOVSP, OP_RSADD } from '@/nwscript/NWScriptOPCodes';
import { NWScriptGlobalVariableAnalyzer } from '@/nwscript/decompiler/NWScriptGlobalVariableAnalyzer';

test('global analysis preserves explicit object constants', () => {
  const instructions = [
    { code: OP_RSADD, type: NWScriptDataType.OBJECT, address: 0 },
    { code: OP_CONST, type: NWScriptDataType.OBJECT, object: 1, address: 2 },
    { code: OP_CPDOWNSP, type: 1, offset: -8, size: 4, address: 8 },
    { code: OP_MOVSP, type: 0, offset: -4, address: 16 },
  ] as NWScriptInstruction[];
  for (let index = 0; index < instructions.length; index += 1) {
    if (index > 0) instructions[index].prevInstr = instructions[index - 1];
    if (index + 1 < instructions.length) instructions[index].nextInstr = instructions[index + 1];
  }
  const script = {
    instructions: new Map(instructions.map(instruction => [instruction.address, instruction])),
  } as NWScript;

  const [global] = new NWScriptGlobalVariableAnalyzer(script).analyze();

  expect(global.hasInitializer).toBe(true);
  expect(global.initialValue).toBe(1);
  expect(global.dataType).toBe(NWScriptDataType.OBJECT);
  expect(global.offset).toBe(-4);
});
