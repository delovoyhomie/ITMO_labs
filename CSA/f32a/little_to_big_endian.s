    .text
    .org 0x100

_start:
    lit 0x80
    a!
    @
    reverse_bytes
    lit 0x84
    b!
    !b
    halt

reverse_bytes:
    dup
    a!
    extract_byte_0
    shift_left_24

    a
    extract_byte_1
    shift_left_16
    +

    a
    extract_byte_2
    shift_left_8
    +

    a
    extract_byte_3
    +
    ;

extract_byte_0:
    lit 255
    and
    ;

extract_byte_1:
    shift_right_8
    extract_byte_0
    ;

extract_byte_2:
    shift_right_8
    shift_right_8
    extract_byte_0
    ;

extract_byte_3:
    shift_right_8
    shift_right_8
    shift_right_8
    extract_byte_0
    ;

shift_left_24:
    shift_left_8
    shift_left_8
    shift_left_8
    ;

shift_left_16:
    shift_left_8
    shift_left_8
    ;

shift_left_8:
    2*
    2*
    2*
    2*
    2*
    2*
    2*
    2*
    ;

shift_right_8:
    2/
    2/
    2/
    2/
    2/
    2/
    2/
    2/
    ;
