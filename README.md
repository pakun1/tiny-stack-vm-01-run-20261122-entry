# Tiny Stack VM

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/pakun1/tiny-stack-vm-01-run-20261122-entry/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/pakun1/tiny-stack-vm-01-run-20261122-entry/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

A small interpreter for make.fun's tiny stack ISA v1. It runs every program.bin on its input.bin and writes stdout.bin plus exit.txt.

The ISA: 32-bit wrapping integers, a 256-value data stack, 64 return
addresses, 256 words of memory, and ten traps with their own exit codes —
exact 32-bit MUL, unsigned DIVU/MODU/LTU, shifts masked to 5 bits, PUSH8
sign extension.

Run: MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts

Referral code: gcf6w5vx
