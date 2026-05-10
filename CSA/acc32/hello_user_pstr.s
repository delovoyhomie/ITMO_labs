    .data
    .org 0x00

result_buf:      .byte  '________________________________'

    .data
    .org 0x20

prompt:          .byte  'What is your name?', 0x0A, 0
prefix:          .byte  'Hello, ', 0

buf_ptr:         .word  0
scan_ptr:        .word  0
current_char:    .word  0
result_len:      .word  0

input_addr:      .word  0x80
output_addr:     .word  0x84

const_1:         .word  1
const_8:         .word  8
const_30:        .word  30
const_0A:        .word  0x0A
const_FF:        .word  0xFF
const_exc:       .word  '!'
const_hel:       .word  0x6C654800
const_us4:       .word  0x5F5F5F5F
error_word:      .word  0xCCCCCCCC

    .text
    .org 0x90

_start:
    load_imm     prompt
    store        scan_ptr

prompt_loop:
    load         scan_ptr
    load_acc
    and          const_FF
    beqz         prompt_done

    store_ind    output_addr

    load         scan_ptr
    add          const_1
    store        scan_ptr
    jmp          prompt_loop

prompt_done:
    load_imm     prefix
    store        scan_ptr

    load         const_1
    store        buf_ptr

prefix_loop:
    load         scan_ptr
    load_acc
    and          const_FF
    beqz         prefix_done

    store_ind    buf_ptr

    load         scan_ptr
    add          const_1
    store        scan_ptr

    load         buf_ptr
    add          const_1
    store        buf_ptr
    jmp          prefix_loop

prefix_done:
read_name:
    load         input_addr
    load_acc
    and          const_FF
    store        current_char

    load         current_char
    sub          const_0A
    beqz         name_end

    load         buf_ptr
    sub          const_30
    beqz         overflow

    load         current_char
    store_ind    buf_ptr

    load         buf_ptr
    add          const_1
    store        buf_ptr
    jmp          read_name

name_end:
    load         buf_ptr
    sub          const_8
    beqz         overflow

    load         const_exc
    store_ind    buf_ptr

    load         buf_ptr
    add          const_1
    store        buf_ptr

    load         const_us4
    store_ind    buf_ptr

    load         buf_ptr
    sub          const_1
    store        result_len

    load         const_hel
    add          result_len
    store        result_buf

    load         const_1
    store        scan_ptr

output_loop:
    load         scan_ptr
    sub          buf_ptr
    beqz         finish

    load         scan_ptr
    load_acc
    and          const_FF
    store_ind    output_addr

    load         scan_ptr
    add          const_1
    store        scan_ptr
    jmp          output_loop

overflow:
    load         error_word
    store_ind    output_addr
    jmp          finish

finish:
    halt
