// Tiny stack VM for make.fun's tiny stack ISA v1: 32-bit wrapping integers,
// a 256-value data stack, 64 return addresses, 256 words of memory. A trap
// ends the program with its code, keeping the output written before it.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SK = 256, CK = 64, MW = 256, SL = 1e6, OL = 65536;
// Traps: underflow 2, overflow 3, div0 4, opcode 5, memory 6, call 7, ret 8, pc 9, steps 10, output 11.
const TU = 2, TO = 3, TD = 4, TB = 5, TM = 6, TK = 7, TR = 8, TP = 9, TS = 10, TX = 11;

// [immediate, popped, pushed] per opcode byte (decimal); binary ops share [0, 2, 1].
const SHAPE: Record<number, [number, number, number]> = {
  0: [0, 0, 0], 1: [1, 0, 1], 2: [4, 0, 1], 3: [0, 1, 0], 4: [0, 1, 2], 5: [0, 2, 2], 6: [0, 2, 3], 7: [0, 3, 3],
  23: [0, 1, 1], 27: [0, 1, 1],
  48: [2, 0, 0], 49: [2, 1, 0], 50: [2, 1, 0], 51: [2, 0, 0], 52: [0, 0, 0],
  64: [0, 1, 1], 65: [0, 2, 0],
  80: [0, 1, 0], 81: [0, 1, 0], 82: [0, 0, 1], 83: [0, 1, 0],
};

function run(prog: Uint8Array, input: Uint8Array) {
  const n = prog.length;
  const s = new Int32Array(SK);
  let sp = 0;
  const c = new Int32Array(CK);
  let cp = 0;
  const m = new Int32Array(MW);
  const out = new Uint8Array(OL);
  let ol = 0, ip = 0, pc = 0, steps = 0;
  const done = (code: number) => ({ bytes: out.slice(0, ol), code });
  for (;;) {
    if (steps === SL) return done(TS);
    if (pc < 0 || pc >= n) return done(TP);
    const op = prog[pc];
    const shape = SHAPE[op] ?? (op >= 16 && op <= 34 && op !== 23 && op !== 27 && op !== 31 ? [0, 2, 1] : undefined);
    if (shape === undefined) return done(TB);
    const [imm, pops, pushes] = shape;
    if (pc + imm >= n) return done(TP);
    steps++;
    const after = pc + 1 + imm;
    if (sp < pops) return done(TU);
    if (sp - pops + pushes > SK) return done(TO);
    pc = after;
    if (op >= 0x10 && op <= 0x22 && op !== 0x17 && op !== 0x1b) {
      const y = s[sp - 1], x = s[sp - 2];
      let v: number;
      switch (op) {
        case 0x10: v = (x + y) | 0; break;
        case 0x11: v = (x - y) | 0; break;
        case 0x12: v = Math.imul(x, y); break;
        case 0x13:
          if (y === 0) return done(TD);
          v = x === -2147483648 && y === -1 ? x : (x / y) | 0;
          break;
        case 0x14:
          if (y === 0) return done(TD);
          v = y === -1 ? 0 : (x % y) | 0;
          break;
        case 0x15:
          if (y === 0) return done(TD);
          v = Math.floor((x >>> 0) / (y >>> 0)) | 0;
          break;
        case 0x16:
          if (y === 0) return done(TD);
          v = ((x >>> 0) % (y >>> 0)) | 0;
          break;
        case 0x18: v = x & y; break;
        case 0x19: v = x | y; break;
        case 0x1a: v = x ^ y; break;
        case 0x1c: v = x << (y & 31); break;
        case 0x1d: v = x >> (y & 31); break;
        case 0x1e: v = (x >>> (y & 31)) | 0; break;
        case 0x20: v = x === y ? 1 : 0; break;
        case 0x21: v = x < y ? 1 : 0; break;
        default: v = x >>> 0 < (y >>> 0) ? 1 : 0;
      }
      s[sp - 2] = v;
      sp--;
      continue;
    }
    switch (op) {
      case 0x00:
        return done(0);
      case 0x01:
        s[sp++] = (prog[after - 1] << 24) >> 24;
        break;
      case 0x02:
        s[sp++] = prog[after - 4] | (prog[after - 3] << 8) | (prog[after - 2] << 16) | (prog[after - 1] << 24);
        break;
      case 0x03:
        sp--;
        break;
      case 0x04:
        s[sp] = s[sp - 1];
        sp++;
        break;
      case 0x05: {
        const t = s[sp - 1];
        s[sp - 1] = s[sp - 2];
        s[sp - 2] = t;
        break;
      }
      case 0x06:
        s[sp] = s[sp - 2];
        sp++;
        break;
      case 0x07: {
        const t = s[sp - 3];
        s[sp - 3] = s[sp - 2];
        s[sp - 2] = s[sp - 1];
        s[sp - 1] = t;
        break;
      }
      case 0x17:
        s[sp - 1] = (-s[sp - 1]) | 0;
        break;
      case 0x1b:
        s[sp - 1] = ~s[sp - 1];
        break;
      case 0x30: case 0x31: case 0x32: {
        const rel = ((prog[after - 2] | (prog[after - 1] << 8)) << 16) >> 16;
        if (op === 0x30) {
          pc = after + rel;
        } else {
          const v = s[--sp];
          if ((op === 0x31) === (v === 0)) pc = after + rel;
        }
        break;
      }
      case 0x33: {
        if (cp === CK) return done(TK);
        c[cp++] = after;
        pc = prog[after - 2] | (prog[after - 1] << 8);
        break;
      }
      case 0x34:
        if (cp === 0) return done(TR);
        pc = c[--cp];
        break;
      case 0x40: {
        const addr = s[sp - 1];
        if (addr < 0 || addr >= MW) return done(TM);
        s[sp - 1] = m[addr];
        break;
      }
      case 0x41: {
        const addr = s[sp - 1];
        if (addr < 0 || addr >= MW) return done(TM);
        m[addr] = s[sp - 2];
        sp -= 2;
        break;
      }
      case 0x50: {
        const text = String(s[sp - 1]);
        if (ol + text.length > OL) return done(TX);
        sp--;
        for (let i = 0; i < text.length; i++) out[ol++] = text.charCodeAt(i);
        break;
      }
      case 0x51:
        if (ol + 1 > OL) return done(TX);
        out[ol++] = s[--sp] & 255;
        break;
      case 0x52:
        s[sp++] = ip < input.length ? input[ip++] : -1;
        break;
      case 0x53:
        return done(s[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.bytes);
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
