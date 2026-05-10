    .data

input_addr:      .word  0x80
output_addr:     .word  0x84
stack_top:       .word  0x300

    .text
    .org 0x100

make_overflow_error:
    lui      a0, 0xCCCCD
    addi     a0, a0, -820
    jr       ra

sum_formula:
    addi     t0, zero, 2
    rem      t1, a0, t0
    bnez     t1, sum_formula_odd

    div      t1, a0, t0
    addi     t2, a0, 1
    mul      a0, t1, t2
    jr       ra

sum_formula_odd:
    addi     t1, a0, 1
    div      t1, t1, t0
    mul      a0, a0, t1
    jr       ra

sum_n:
    addi     sp, sp, -4
    sw       ra, 0(sp)

    lui      t0, 0x10
    addi     t0, t0, -1
    bgt      a0, t0, sum_n_overflow

    jal      ra, sum_formula
    j        sum_n_return

sum_n_overflow:
    jal      ra, make_overflow_error

sum_n_return:
    lw       ra, 0(sp)
    addi     sp, sp, 4
    jr       ra

write_result:
    lui      t0, %hi(output_addr)
    addi     t0, t0, %lo(output_addr)
    lw       t0, 0(t0)
    sw       a0, 0(t0)
    halt

_start:
    lui      t0, %hi(input_addr)
    addi     t0, t0, %lo(input_addr)
    lw       t0, 0(t0)
    lw       a0, 0(t0)

    ble      a0, zero, domain_error

    addi     a1, zero, 0
    lui      sp, %hi(stack_top)
    addi     sp, sp, %lo(stack_top)
    lw       sp, 0(sp)

    jal      ra, sum_n
    j        write_result

domain_error:
    addi     a0, zero, -1
    j        write_result
