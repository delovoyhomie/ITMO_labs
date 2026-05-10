    .data
.org             0x00

result_buf_0:    .byte  '________________________________'
result_buf_1:    .byte  '________________________________'
line_buf_0:      .byte  '________________________________'
line_buf_1:      .byte  '________________________________'
alignment:       .word  0, 0

word_sigs:       .word  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
word_counts:     .word  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
uniq_count:      .word  0

input_addr:      .word  0x80
output_addr:     .word  0x84
stack_top:       .word  0x500

    .text

_start:
    movea.l  stack_top, A7
    movea.l  (A7), A7

    movea.l  input_addr, A0
    movea.l  (A0), A0
    movea.l  output_addr, A1
    movea.l  (A1), A1

    jsr      read_line
    cmp.l    0, D0
    blt      write_status_word

    jsr      parse_and_count
    cmp.l    0, D0
    blt      write_status_word

    jsr      build_result
    jsr      output_result
    halt

write_status_word:
    move.l   D0, (A1)
    halt

read_line:
    link     A6, -4
    movea.l  line_buf_0, A2
    move.l   0, D2

read_line_loop:
    move.l   (A0), D0
    and.l    0xFF, D0
    cmp.b    0x0A, D0
    beq      read_line_done

    cmp.l    63, D2
    bge      read_line_overflow

    move.b   D0, (A2)+
    add.l    1, D2
    jmp      read_line_loop

read_line_done:
    move.b   0, (A2)
    move.l   D2, D0
    unlk     A6
    rts

read_line_overflow:
    move.l   0xCCCCCCCC, D0
    unlk     A6
    rts

parse_and_count:
    link     A6, -4
    movea.l  uniq_count, A5
    move.l   0, D4
    move.l   D4, (A5)

    movea.l  line_buf_0, A2
    move.l   0, D3
    move.l   0, D6
    move.l   0, D7
    move.l   D0, -4(A6)

parse_loop:
    cmp.l    -4(A6), D3
    bge      parse_after_loop

    move.b   (A2)+, D0
    and.l    0xFF, D0
    add.l    1, D3

    cmp.b    ' ' , D0
    beq      parse_separator
    cmp.b    ',' , D0
    beq      parse_separator
    cmp.b    '.' , D0
    beq      parse_separator

    cmp.l    3, D6
    bge      parse_error

    cmp.l    0, D6
    bne      append_len_1
    or.l     D0, D7
    add.l    1, D6
    jmp      parse_loop

append_len_1:
    cmp.l    1, D6
    bne      append_len_2
    lsl.l    8, D0
    or.l     D0, D7
    add.l    1, D6
    jmp      parse_loop

append_len_2:
    lsl.l    16, D0
    or.l     D0, D7
    add.l    1, D6
    jmp      parse_loop

parse_separator:
    cmp.l    0, D6
    beq      parse_loop

    jsr      finish_word
    cmp.l    0, D0
    blt      parse_error_return
    jmp      parse_loop

parse_after_loop:
    cmp.l    0, D6
    beq      parse_success

    jsr      finish_word
    cmp.l    0, D0
    blt      parse_error_return

parse_success:
    move.l   0, D0
    unlk     A6
    rts

parse_error:
    move.l   -1, D0

parse_error_return:
    unlk     A6
    rts

finish_word:
    link     A6, -4

    move.l   D6, D0
    lsl.l    24, D0
    or.l     D0, D7

    jsr      find_word
    cmp.l    -1, D0
    beq      finish_new_word

    move.l   D0, D4
    lsl.l    2, D4
    movea.l  word_counts, A3
    move.l   0(A3,D4), D1
    add.l    1, D1
    move.l   D1, 0(A3,D4)

    move.l   0, D6
    move.l   0, D7
    move.l   0, D0
    unlk     A6
    rts

finish_new_word:
    movea.l  uniq_count, A5
    move.l   (A5), D1
    cmp.l    12, D1
    bge      finish_error

    move.l   D1, D4
    lsl.l    2, D4

    movea.l  word_sigs, A4
    move.l   D7, 0(A4,D4)

    movea.l  word_counts, A3
    move.l   1, D2
    move.l   D2, 0(A3,D4)

    add.l    1, D1
    move.l   D1, (A5)

    move.l   0, D6
    move.l   0, D7
    move.l   0, D0
    unlk     A6
    rts

finish_error:
    move.l   -1, D0
    unlk     A6
    rts

find_word:
    link     A6, -4
    movea.l  uniq_count, A5
    move.l   (A5), D1
    move.l   0, D2
    movea.l  word_sigs, A4

find_loop:
    cmp.l    D1, D2
    bge      find_not_found

    move.l   D2, D4
    lsl.l    2, D4
    move.l   0(A4,D4), D0
    cmp.l    D0, D7
    beq      find_found

    add.l    1, D2
    jmp      find_loop

find_found:
    move.l   D2, D0
    unlk     A6
    rts

find_not_found:
    move.l   -1, D0
    unlk     A6
    rts

build_result:
    link     A6, -4
    movea.l  result_buf_0, A0
    movea.l  uniq_count, A5
    move.l   (A5), D2
    move.l   0, D1

    cmp.l    0, D2
    bne      build_loop

    move.b   0, (A0)
    unlk     A6
    rts

build_loop:
    move.l   D1, D4
    lsl.l    2, D4
    movea.l  word_counts, A3
    move.l   0(A3,D4), D0
    jsr      append_count

    add.l    1, D1
    cmp.l    D2, D1
    bge      build_done

    move.b   ' ' , (A0)+
    jmp      build_loop

build_done:
    move.b   0, (A0)
    unlk     A6
    rts

append_count:
    link     A6, -4
    cmp.l    10, D0
    blt      append_single_digit

    move.l   D0, D4
    div.l    10, D4
    move.l   D4, D5
    add.l    '0' , D4
    move.b   D4, (A0)+

    mul.l    10, D5
    move.l   D0, D4
    sub.l    D5, D4
    add.l    '0' , D4
    move.b   D4, (A0)+
    unlk     A6
    rts

append_single_digit:
    add.l    '0' , D0
    move.b   D0, (A0)+
    unlk     A6
    rts

output_result:
    link     A6, -4
    movea.l  result_buf_0, A0

output_loop:
    move.b   (A0)+, D0
    cmp.b    0, D0
    beq      output_done

    move.b   D0, (A1)
    jmp      output_loop

output_done:
    unlk     A6
    rts
