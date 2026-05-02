(module
  (import "wasi_snapshot_preview1" "fd_write" (func $fd_write (param i32 i32 i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "fd_read" (func $fd_read (param i32 i32 i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "args_sizes_get" (func $args_sizes_get (param i32 i32) (result i32)))
  (import "wasi_snapshot_preview1" "args_get" (func $args_get (param i32 i32) (result i32)))
  (memory (export "memory") 1024)
  (global $__heap_ptr (mut i32) (i32.const 64))
  (global $__last_str_len (mut i32) (i32.const 0))
  (global $__ml_argc (mut i32) (i32.const 0))
  (global $__last_exc_code (export "__last_exception_code") (mut i32) (i32.const 0))

  ;; -- WASI runtime ------------------------------------------------------------
  ;; Write `len` bytes at `ptr` to stdout via WASI fd_write.
  (func $__wasi_write (param $ptr i32) (param $len i32)
    i32.const 67108800
    local.get $ptr
    i32.store
    i32.const 67108804
    local.get $len
    i32.store
    i32.const 1
    i32.const 67108800
    i32.const 1
    i32.const 67108808
    call $fd_write
    drop
  )
  ;; Write `len` bytes at `ptr` to file-descriptor `fd` via WASI fd_write.
  (func $__wasi_write_fd (param $fd i32) (param $ptr i32) (param $len i32)
    i32.const 67108800
    local.get $ptr
    i32.store
    i32.const 67108804
    local.get $len
    i32.store
    local.get $fd
    i32.const 67108800
    i32.const 1
    i32.const 67108808
    call $fd_write
    drop
  )
  ;; Format a non-negative i64 as decimal, writing backwards from address 67108864.
  ;; Returns: (start_ptr: i32, byte_len: i32)
  (func $__fmt_u64 (param $n i64) (result i32 i32)
    (local $ptr i32)
    (local $digit i32)
    i32.const 67108864
    local.set $ptr
    local.get $n
    i64.const 0
    i64.eq
    if
      local.get $ptr
      i32.const 1
      i32.sub
      local.tee $ptr
      i32.const 48
      i32.store8
    else
      block $done
        loop $lp
          local.get $n
          i64.const 0
          i64.le_u
          br_if $done
          local.get $n
          i64.const 10
          i64.rem_u
          i32.wrap_i64
          i32.const 48
          i32.add
          local.set $digit
          local.get $n
          i64.const 10
          i64.div_u
          local.set $n
          local.get $ptr
          i32.const 1
          i32.sub
          local.tee $ptr
          local.get $digit
          i32.store8
          br $lp
        end
      end
    end
    local.get $ptr
    i32.const 67108864
    local.get $ptr
    i32.sub
  )
  ;; Write 6 decimal digits of n (0..999999) to 67108812..67108817, strip trailing
  ;; zeros (keep at least 1).  Returns: (ptr=67108812, trimmed_len: i32)
  (func $__fmt_frac6 (param $n i64) (result i32 i32)
    (local $trimmed i32)
    i32.const 67108812
    local.get $n
    i64.const 100000
    i64.div_u
    i32.wrap_i64
    i32.const 48
    i32.add
    i32.store8
    i32.const 67108813
    local.get $n
    i64.const 100000
    i64.rem_u
    i64.const 10000
    i64.div_u
    i32.wrap_i64
    i32.const 48
    i32.add
    i32.store8
    i32.const 67108814
    local.get $n
    i64.const 10000
    i64.rem_u
    i64.const 1000
    i64.div_u
    i32.wrap_i64
    i32.const 48
    i32.add
    i32.store8
    i32.const 67108815
    local.get $n
    i64.const 1000
    i64.rem_u
    i64.const 100
    i64.div_u
    i32.wrap_i64
    i32.const 48
    i32.add
    i32.store8
    i32.const 67108816
    local.get $n
    i64.const 100
    i64.rem_u
    i64.const 10
    i64.div_u
    i32.wrap_i64
    i32.const 48
    i32.add
    i32.store8
    i32.const 67108817
    local.get $n
    i64.const 10
    i64.rem_u
    i32.wrap_i64
    i32.const 48
    i32.add
    i32.store8
    i32.const 6
    local.set $trimmed
    block $done
      loop $strip
        local.get $trimmed
        i32.const 1
        i32.le_s
        br_if $done
        i32.const 67108812
        local.get $trimmed
        i32.const 1
        i32.sub
        i32.add
        i32.load8_u
        i32.const 48
        i32.eq
        i32.eqz
        br_if $done
        local.get $trimmed
        i32.const 1
        i32.sub
        local.set $trimmed
        br $strip
      end
    end
    i32.const 67108812
    local.get $trimmed
  )
  ;; Print a newline.
  (func $print_newline
    i32.const 67108812
    i32.const 10
    i32.store8
    i32.const 67108812
    i32.const 1
    call $__wasi_write
  )
  ;; Print a space separator.
  (func $print_sep
    i32.const 67108812
    i32.const 32
    i32.store8
    i32.const 67108812
    i32.const 1
    call $__wasi_write
  )
  ;; Print a UTF-8 string from linear memory.
  (func $print_str (param $ptr i32) (param $len i32)
    local.get $ptr
    local.get $len
    call $__wasi_write
  )
  ;; Print a boolean: non-zero -> "True", zero -> "False".
  (func $print_bool (param $v i32)
    local.get $v
    i32.eqz
    if
      i32.const 67108812
      i32.const 70
      i32.store8
      i32.const 67108813
      i32.const 97
      i32.store8
      i32.const 67108814
      i32.const 108
      i32.store8
      i32.const 67108815
      i32.const 115
      i32.store8
      i32.const 67108816
      i32.const 101
      i32.store8
      i32.const 67108812
      i32.const 5
      call $__wasi_write
    else
      i32.const 67108812
      i32.const 84
      i32.store8
      i32.const 67108813
      i32.const 114
      i32.store8
      i32.const 67108814
      i32.const 117
      i32.store8
      i32.const 67108815
      i32.const 101
      i32.store8
      i32.const 67108812
      i32.const 4
      call $__wasi_write
    end
  )
  ;; Print a double-precision float.
  ;; Integer values (v == trunc(v), |v| < 1e15) are printed as plain "N".
  ;; Other values are printed with up to 6 fractional decimal places.
  (func $print_f64 (param $v f64)
    (local $int_part i64)
    (local $frac f64)
    (local $frac_scaled i64)
    (local $ptr i32)
    (local $len i32)
    local.get $v
    local.get $v
    f64.ne
    if
      i32.const 67108812
      i32.const 110
      i32.store8
      i32.const 67108813
      i32.const 97
      i32.store8
      i32.const 67108814
      i32.const 110
      i32.store8
      i32.const 67108812
      i32.const 3
      call $__wasi_write
      return
    end
    local.get $v
    f64.const 0.0
    f64.lt
    if
      i32.const 67108812
      i32.const 45
      i32.store8
      i32.const 67108812
      i32.const 1
      call $__wasi_write
      local.get $v
      f64.neg
      local.set $v
    end
    local.get $v
    f64.const inf
    f64.eq
    if
      i32.const 67108812
      i32.const 105
      i32.store8
      i32.const 67108813
      i32.const 110
      i32.store8
      i32.const 67108814
      i32.const 102
      i32.store8
      i32.const 67108812
      i32.const 3
      call $__wasi_write
      return
    end
    local.get $v
    f64.trunc
    local.get $v
    f64.eq
    local.get $v
    f64.const 1000000000000000.0
    f64.lt
    i32.and
    if
      local.get $v
      i64.trunc_f64_u
      local.set $int_part
      local.get $int_part
      call $__fmt_u64
      local.set $len
      local.set $ptr
      local.get $ptr
      local.get $len
      call $__wasi_write
      return
    end
    local.get $v
    f64.trunc
    i64.trunc_f64_u
    local.set $int_part
    local.get $int_part
    call $__fmt_u64
    local.set $len
    local.set $ptr
    local.get $ptr
    local.get $len
    call $__wasi_write
    i32.const 67108812
    i32.const 46
    i32.store8
    i32.const 67108812
    i32.const 1
    call $__wasi_write
    local.get $v
    local.get $v
    f64.trunc
    f64.sub
    local.set $frac
    local.get $frac
    f64.const 1000000.0
    f64.mul
    f64.nearest
    i64.trunc_f64_u
    local.set $frac_scaled
    local.get $frac_scaled
    i64.const 0
    i64.eq
    if
      i32.const 67108812
      i32.const 48
      i32.store8
      i32.const 67108812
      i32.const 1
      call $__wasi_write
    else
      local.get $frac_scaled
      call $__fmt_frac6
      local.set $len
      local.set $ptr
      local.get $ptr
      local.get $len
      call $__wasi_write
    end
  )
  ;; Self-contained power: base^exp.
  ;; Exact for exp in (0, 1, 0.5, -0.5) and integer exponents up to 2^31-1.
  ;; Non-integer, non-half exponents return NaN.
  (func $pow_f64 (param $base f64) (param $exp f64) (result f64)
    (local $result f64)
    (local $n i32)
    (local $neg i32)
    local.get $exp
    f64.const 0.0
    f64.eq
    if
      f64.const 1.0
      return
    end
    local.get $exp
    f64.const 1.0
    f64.eq
    if
      local.get $base
      return
    end
    local.get $exp
    f64.const 0.5
    f64.eq
    if
      local.get $base
      f64.sqrt
      return
    end
    local.get $exp
    f64.const -0.5
    f64.eq
    if
      f64.const 1.0
      local.get $base
      f64.sqrt
      f64.div
      return
    end
    f64.const 0.0
    local.get $exp
    f64.lt
    local.set $neg
    local.get $exp
    f64.abs
    local.set $exp
    local.get $exp
    f64.trunc
    local.get $exp
    f64.ne
    if
      f64.const nan
      return
    end
    local.get $exp
    i32.trunc_f64_u
    local.set $n
    f64.const 1.0
    local.set $result
    block $done
      loop $lp
        local.get $n
        i32.eqz
        br_if $done
        local.get $result
        local.get $base
        f64.mul
        local.set $result
        local.get $n
        i32.const 1
        i32.sub
        local.set $n
        br $lp
      end
    end
    local.get $neg
    if
      f64.const 1.0
      local.get $result
      f64.div
      local.set $result
    end
    local.get $result
  )
  ;; -- Allocator ------------------------------------------------------------
  ;; Three segregated free lists by size class (=32, =64, =256 bytes).
  ;; Larger blocks are bump-allocated and never freed (no GC needed for them).
  (global $__fl_s32  (mut i32) (i32.const 0))
  (global $__fl_s64  (mut i32) (i32.const 0))
  (global $__fl_s256 (mut i32) (i32.const 0))
  ;; Heap base: fixed at compile time for reset support.
  (global $__heap_base i32 (i32.const 64))
  ;; Allocate `size` bytes; returns i32 pointer.
  ;; Checks the appropriate free list first, falls back to bump allocation.
  (func $ml_alloc (param $size i32) (result i32)
    (local $head i32) (local $ptr i32)
    block $miss
      local.get $size
      i32.const 32
      i32.le_s
      if
        global.get $__fl_s32
        local.tee $head
        i32.eqz
        br_if $miss
        local.get $head
        i32.load
        global.set $__fl_s32
        local.get $head
        return
      end
      local.get $size
      i32.const 64
      i32.le_s
      if
        global.get $__fl_s64
        local.tee $head
        i32.eqz
        br_if $miss
        local.get $head
        i32.load
        global.set $__fl_s64
        local.get $head
        return
      end
      local.get $size
      i32.const 256
      i32.le_s
      if
        global.get $__fl_s256
        local.tee $head
        i32.eqz
        br_if $miss
        local.get $head
        i32.load
        global.set $__fl_s256
        local.get $head
        return
      end
    end
    global.get $__heap_ptr
    local.set $ptr
    local.get $ptr
    local.get $size
    i32.add
    global.set $__heap_ptr
    local.get $ptr
  )
  ;; Return `size` bytes at `ptr` to the appropriate free list.
  ;; Blocks larger than 256 bytes are not tracked (bump-only region).
  (func $ml_free (param $ptr i32) (param $size i32)
    local.get $size
    i32.const 32
    i32.le_s
    if
      local.get $ptr
      global.get $__fl_s32
      i32.store
      local.get $ptr
      global.set $__fl_s32
      return
    end
    local.get $size
    i32.const 64
    i32.le_s
    if
      local.get $ptr
      global.get $__fl_s64
      i32.store
      local.get $ptr
      global.set $__fl_s64
      return
    end
    local.get $size
    i32.const 256
    i32.le_s
    if
      local.get $ptr
      global.get $__fl_s256
      i32.store
      local.get $ptr
      global.set $__fl_s256
      return
    end
  )
  ;; Reset heap to its initial state and clear all free lists.
  ;; Exported so the browser host can call it between "run" invocations.
  (func $__ml_reset (export "__ml_reset")
    global.get $__heap_base
    global.set $__heap_ptr
    i32.const 0
    global.set $__fl_s32
    i32.const 0
    global.set $__fl_s64
    i32.const 0
    global.set $__fl_s256
  )
  ;; Return the byte length of the last string-valued function result.
  ;; JS callers: invoke immediately after a string-returning export, then
  ;; decode memory.buffer[ptr .. ptr+len] as UTF-8.
  (func $__ml_str_len (export "__ml_str_len") (result i32)
    global.get $__last_str_len
  )
  ;; Print a double-precision float always showing a decimal point.
  ;; Integer values (v == trunc(v), |v| < 1e15) are printed as "N.0".
  ;; Use this when the source literal was written as 1.0, 2.0, etc.
  (func $print_f64_float (param $v f64)
    (local $int_part i64)
    (local $frac f64)
    (local $frac_scaled i64)
    (local $ptr i32)
    (local $len i32)
    local.get $v
    local.get $v
    f64.ne
    if
      i32.const 67108812
      i32.const 110
      i32.store8
      i32.const 67108813
      i32.const 97
      i32.store8
      i32.const 67108814
      i32.const 110
      i32.store8
      i32.const 67108812
      i32.const 3
      call $__wasi_write
      return
    end
    local.get $v
    f64.const 0.0
    f64.lt
    if
      i32.const 67108812
      i32.const 45
      i32.store8
      i32.const 67108812
      i32.const 1
      call $__wasi_write
      local.get $v
      f64.neg
      local.set $v
    end
    local.get $v
    f64.const inf
    f64.eq
    if
      i32.const 67108812
      i32.const 105
      i32.store8
      i32.const 67108813
      i32.const 110
      i32.store8
      i32.const 67108814
      i32.const 102
      i32.store8
      i32.const 67108812
      i32.const 3
      call $__wasi_write
      return
    end
    local.get $v
    f64.trunc
    local.get $v
    f64.eq
    local.get $v
    f64.const 1000000000000000.0
    f64.lt
    i32.and
    if
      local.get $v
      i64.trunc_f64_u
      local.set $int_part
      local.get $int_part
      call $__fmt_u64
      local.set $len
      local.set $ptr
      local.get $ptr
      local.get $len
      call $__wasi_write
      i32.const 67108812
      i32.const 46
      i32.store8
      i32.const 67108813
      i32.const 48
      i32.store8
      i32.const 67108812
      i32.const 2
      call $__wasi_write
      return
    end
    local.get $v
    f64.trunc
    i64.trunc_f64_u
    local.set $int_part
    local.get $int_part
    call $__fmt_u64
    local.set $len
    local.set $ptr
    local.get $ptr
    local.get $len
    call $__wasi_write
    i32.const 67108812
    i32.const 46
    i32.store8
    i32.const 67108812
    i32.const 1
    call $__wasi_write
    local.get $v
    local.get $v
    f64.trunc
    f64.sub
    local.set $frac
    local.get $frac
    f64.const 1000000.0
    f64.mul
    f64.nearest
    i64.trunc_f64_u
    local.set $frac_scaled
    local.get $frac_scaled
    i64.const 0
    i64.eq
    if
      i32.const 67108812
      i32.const 48
      i32.store8
      i32.const 67108812
      i32.const 1
      call $__wasi_write
    else
      local.get $frac_scaled
      call $__fmt_frac6
      local.set $len
      local.set $ptr
      local.get $ptr
      local.get $len
      call $__wasi_write
    end
  )
  ;; argv support -------------------------------------------------------------
  ;; $__ml_argc caches the argument count after $__ml_init_argv is called.
  ;; Populated at module startup; never written by user code.
  ;; Init: reads argc + argv via WASI args_sizes_get / args_get into static buffers.
  ;; Layout: argv_data [67107840..67108351], argv_ptrs [67108352..67108479]
  (func $__ml_init_argv
    i32.const 67108480
    i32.const 67108800
    call $args_sizes_get
    drop
    i32.const 67108480
    i32.load
    global.set $__ml_argc
    i32.const 67108352
    i32.const 67107840
    call $args_get
    drop
  )
  ;; Return argument count as f64.
  (func $argc (export "argc") (result f64)
    global.get $__ml_argc
    f64.convert_i32_u
  )
  ;; Return i-th argument as a string (ptr as f64, length in $__last_str_len).
  (func $argv (param $i f64) (result f64)
    (local $idx i32)
    (local $ptr i32)
    (local $cur i32)
    local.get $i
    i32.trunc_f64_u
    local.tee $idx
    global.get $__ml_argc
    i32.ge_u
    if
      i32.const 0
      global.set $__last_str_len
      f64.const 0
      return
    end
    i32.const 67108352
    local.get $idx
    i32.const 4
    i32.mul
    i32.add
    i32.load
    local.tee $ptr
    local.set $cur
    block $len_done
      loop $len_loop
        local.get $cur
        i32.load8_u
        i32.eqz
        br_if $len_done
        local.get $cur
        i32.const 1
        i32.add
        local.set $cur
        br $len_loop
      end
    end
    local.get $cur
    local.get $ptr
    i32.sub
    global.set $__last_str_len
    local.get $ptr
    f64.convert_i32_u
  )
  ;; Read one line from stdin (fd 0) into a fixed buffer, strip trailing CR/LF.
  ;; Writes the prompt (if len > 0) to stdout first.
  ;; Returns: buffer address as f64; sets $__last_str_len to byte length.
  ;; Input buffer: [67108544 .. 67108799] (256 bytes).
  ;; In browser mode, delegates to $ml_input_host (JS window.prompt).
  (func $input (param $prompt_ptr i32) (param $prompt_len i32) (result f64)
    (local $nread i32)
    (local $tail i32)
    (local $byte i32)
    local.get $prompt_len
    i32.const 0
    i32.gt_s
    if
      local.get $prompt_ptr
      local.get $prompt_len
      call $__wasi_write
    end
    ;; iovec: ptr = input_buf, len = input_buf_size
    i32.const 67108800
    i32.const 67108544
    i32.store
    i32.const 67108804
    i32.const 256
    i32.store
    i32.const 0
    i32.const 67108800
    i32.const 1
    i32.const 67108808
    call $fd_read
    drop
    i32.const 67108808
    i32.load
    local.set $nread
    ;; strip trailing CR (13) and LF (10)
    block $strip_done
      loop $strip_loop
        local.get $nread
        i32.const 0
        i32.le_s
        br_if $strip_done
        i32.const 67108544
        local.get $nread
        i32.const 1
        i32.sub
        i32.add
        i32.load8_u
        local.set $byte
        local.get $byte
        i32.const 10
        i32.eq
        local.get $byte
        i32.const 13
        i32.eq
        i32.or
        if
          local.get $nread
          i32.const 1
          i32.sub
          local.set $nread
          br $strip_loop
        end
        br $strip_done
      end
    end
    local.get $nread
    global.set $__last_str_len
    i32.const 67108544
    f64.convert_i32_u
  )
  ;; Strip leading and trailing ASCII whitespace (space/tab/CR/LF) from a string.
  ;; Params: $ptr i32, $len i32 (via $__last_str_len on entry).
  ;; Returns f64 = new ptr (i32 as f64); $__last_str_len set to new length.
  ;; The result points into the original linear-memory slice (no copy).
  (func $__str_strip (param $ptr i32) (param $len i32) (result f64)
    (local $end i32)
    (local $b i32)
    local.get $ptr
    local.get $len
    i32.add
    local.set $end
    ;; skip leading whitespace
    block $ldone
      loop $ltrim
        local.get $ptr
        local.get $end
        i32.ge_u
        br_if $ldone
        local.get $ptr
        i32.load8_u
        local.set $b
        local.get $b
        i32.const 32
        i32.eq
        local.get $b
        i32.const 9
        i32.eq
        i32.or
        local.get $b
        i32.const 13
        i32.eq
        i32.or
        local.get $b
        i32.const 10
        i32.eq
        i32.or
        i32.eqz
        br_if $ldone
        local.get $ptr
        i32.const 1
        i32.add
        local.set $ptr
        br $ltrim
      end
    end
    ;; skip trailing whitespace
    block $rdone
      loop $rtrim
        local.get $end
        local.get $ptr
        i32.le_u
        br_if $rdone
        local.get $end
        i32.const 1
        i32.sub
        i32.load8_u
        local.set $b
        local.get $b
        i32.const 32
        i32.eq
        local.get $b
        i32.const 9
        i32.eq
        i32.or
        local.get $b
        i32.const 13
        i32.eq
        i32.or
        local.get $b
        i32.const 10
        i32.eq
        i32.or
        i32.eqz
        br_if $rdone
        local.get $end
        i32.const 1
        i32.sub
        local.set $end
        br $rtrim
      end
    end
    local.get $end
    local.get $ptr
    i32.sub
    global.set $__last_str_len
    local.get $ptr
    f64.convert_i32_u
  )
  ;; Find needle in haystack, returning start index as f64 (-1.0 if not found).
  ;; Params (all i32): $hptr, $hlen = haystack ptr+len; $nptr, $nlen = needle ptr+len.
  ;; The needle ptr+len are passed as i32 (caller converts from f64).
  (func $__str_find
    (param $hptr i32) (param $hlen i32)
    (param $nptr i32) (param $nlen i32)
    (result f64)
    (local $i i32)
    (local $j i32)
    (local $match i32)
    (local $limit i32)
    ;; edge: empty needle always found at 0
    local.get $nlen
    i32.const 0
    i32.le_s
    if
      f64.const 0
      return
    end
    ;; edge: needle longer than haystack ? not found
    local.get $hlen
    local.get $nlen
    i32.lt_s
    if
      f64.const -1
      return
    end
    local.get $hlen
    local.get $nlen
    i32.sub
    local.set $limit
    i32.const 0
    local.set $i
    block $found
      loop $outer
        local.get $i
        local.get $limit
        i32.gt_s
        br_if $found
        i32.const 1
        local.set $match
        i32.const 0
        local.set $j
        block $mismatch
          loop $inner
            local.get $j
            local.get $nlen
            i32.ge_s
            br_if $mismatch
            local.get $hptr
            local.get $i
            i32.add
            local.get $j
            i32.add
            i32.load8_u
            local.get $nptr
            local.get $j
            i32.add
            i32.load8_u
            i32.ne
            if
              i32.const 0
              local.set $match
              br $mismatch
            end
            local.get $j
            i32.const 1
            i32.add
            local.set $j
            br $inner
          end
        end
        local.get $match
        if
          local.get $i
          f64.convert_i32_s
          return
        end
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $outer
      end
    end
    f64.const -1
  )
  ;; -- String helpers --------------------------------------------------------
  ;; ASCII uppercase: allocates copy, a-z ? A-Z.
  ;; Params: $ptr i32, $len i32.  Returns f64 ptr; $__last_str_len = len.
  (func $__str_upper (param $ptr i32) (param $len i32) (result f64)
    (local $out i32) (local $i i32) (local $b i32)
    local.get $len
    call $ml_alloc
    local.set $out
    i32.const 0
    local.set $i
    block $done
      loop $lp
        local.get $i
        local.get $len
        i32.ge_s
        br_if $done
        local.get $ptr
        local.get $i
        i32.add
        i32.load8_u
        local.tee $b
        local.get $b
        i32.const 97
        i32.ge_s
        local.get $b
        i32.const 122
        i32.le_s
        i32.and
        if
          local.get $b
          i32.const 32
          i32.sub
          local.set $b
        end
        local.get $out
        local.get $i
        i32.add
        local.get $b
        i32.store8
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $lp
      end
    end
    local.get $len
    global.set $__last_str_len
    local.get $out
    f64.convert_i32_u
  )
  ;; ASCII lowercase: allocates copy, A-Z ? a-z.
  ;; Params: $ptr i32, $len i32.  Returns f64 ptr; $__last_str_len = len.
  (func $__str_lower (param $ptr i32) (param $len i32) (result f64)
    (local $out i32) (local $i i32) (local $b i32)
    local.get $len
    call $ml_alloc
    local.set $out
    i32.const 0
    local.set $i
    block $done
      loop $lp
        local.get $i
        local.get $len
        i32.ge_s
        br_if $done
        local.get $ptr
        local.get $i
        i32.add
        i32.load8_u
        local.tee $b
        local.get $b
        i32.const 65
        i32.ge_s
        local.get $b
        i32.const 90
        i32.le_s
        i32.and
        if
          local.get $b
          i32.const 32
          i32.add
          local.set $b
        end
        local.get $out
        local.get $i
        i32.add
        local.get $b
        i32.store8
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $lp
      end
    end
    local.get $len
    global.set $__last_str_len
    local.get $out
    f64.convert_i32_u
  )
  ;; Return 1 if haystack starts with needle, else 0.
  (func $__str_startswith
    (param $hptr i32) (param $hlen i32)
    (param $nptr i32) (param $nlen i32)
    (result i32)
    (local $i i32)
    local.get $hlen
    local.get $nlen
    i32.lt_s
    if
      i32.const 0
      return
    end
    local.get $nlen
    i32.eqz
    if
      i32.const 1
      return
    end
    i32.const 0
    local.set $i
    block $no
      loop $lp
        local.get $i
        local.get $nlen
        i32.ge_s
        br_if $no
        local.get $hptr
        local.get $i
        i32.add
        i32.load8_u
        local.get $nptr
        local.get $i
        i32.add
        i32.load8_u
        i32.ne
        if
          i32.const 0
          return
        end
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $lp
      end
    end
    i32.const 1
  )
  ;; Return 1 if haystack ends with needle, else 0.
  (func $__str_endswith
    (param $hptr i32) (param $hlen i32)
    (param $nptr i32) (param $nlen i32)
    (result i32)
    (local $i i32) (local $offset i32)
    local.get $hlen
    local.get $nlen
    i32.lt_s
    if
      i32.const 0
      return
    end
    local.get $nlen
    i32.eqz
    if
      i32.const 1
      return
    end
    local.get $hlen
    local.get $nlen
    i32.sub
    local.set $offset
    i32.const 0
    local.set $i
    block $no
      loop $lp
        local.get $i
        local.get $nlen
        i32.ge_s
        br_if $no
        local.get $hptr
        local.get $offset
        i32.add
        local.get $i
        i32.add
        i32.load8_u
        local.get $nptr
        local.get $i
        i32.add
        i32.load8_u
        i32.ne
        if
          i32.const 0
          return
        end
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $lp
      end
    end
    i32.const 1
  )
  ;; Count non-overlapping occurrences of needle in haystack. Returns f64.
  (func $__str_count
    (param $hptr i32) (param $hlen i32)
    (param $nptr i32) (param $nlen i32)
    (result f64)
    (local $i i32) (local $j i32) (local $count i32) (local $match i32)
    local.get $nlen
    i32.eqz
    if
      local.get $hlen
      i32.const 1
      i32.add
      f64.convert_i32_s
      return
    end
    local.get $hlen
    local.get $nlen
    i32.lt_s
    if
      f64.const 0
      return
    end
    i32.const 0
    local.set $count
    i32.const 0
    local.set $i
    block $done
      loop $outer
        local.get $i
        local.get $hlen
        local.get $nlen
        i32.sub
        i32.gt_s
        br_if $done
        i32.const 1
        local.set $match
        i32.const 0
        local.set $j
        block $miss
          loop $inner
            local.get $j
            local.get $nlen
            i32.ge_s
            br_if $miss
            local.get $hptr
            local.get $i
            i32.add
            local.get $j
            i32.add
            i32.load8_u
            local.get $nptr
            local.get $j
            i32.add
            i32.load8_u
            i32.ne
            if
              i32.const 0
              local.set $match
              br $miss
            end
            local.get $j
            i32.const 1
            i32.add
            local.set $j
            br $inner
          end
        end
        local.get $match
        if
          local.get $count
          i32.const 1
          i32.add
          local.set $count
          local.get $i
          local.get $nlen
          i32.add
          local.set $i
        else
          local.get $i
          i32.const 1
          i32.add
          local.set $i
        end
        br $outer
      end
    end
    local.get $count
    f64.convert_i32_s
  )
  ;; Replace all occurrences of needle with replacement; allocates new string.
  ;; Returns f64 ptr; $__last_str_len = new length.
  (func $__str_replace
    (param $hptr i32) (param $hlen i32)
    (param $nptr i32) (param $nlen i32)
    (param $rptr i32) (param $rlen i32)
    (result f64)
    (local $out i32) (local $newlen i32) (local $count i32)
    (local $i i32) (local $j i32) (local $match i32) (local $wp i32)
    local.get $nlen
    i32.eqz
    if
      local.get $hlen
      global.set $__last_str_len
      local.get $hptr
      f64.convert_i32_u
      return
    end
    i32.const 0
    local.set $count
    i32.const 0
    local.set $i
    block $c_done
      loop $c_lp
        local.get $i
        local.get $hlen
        local.get $nlen
        i32.sub
        i32.gt_s
        br_if $c_done
        i32.const 1
        local.set $match
        i32.const 0
        local.set $j
        block $c_miss
          loop $c_inner
            local.get $j
            local.get $nlen
            i32.ge_s
            br_if $c_miss
            local.get $hptr
            local.get $i
            i32.add
            local.get $j
            i32.add
            i32.load8_u
            local.get $nptr
            local.get $j
            i32.add
            i32.load8_u
            i32.ne
            if
              i32.const 0
              local.set $match
              br $c_miss
            end
            local.get $j
            i32.const 1
            i32.add
            local.set $j
            br $c_inner
          end
        end
        local.get $match
        if
          local.get $count
          i32.const 1
          i32.add
          local.set $count
          local.get $i
          local.get $nlen
          i32.add
          local.set $i
        else
          local.get $i
          i32.const 1
          i32.add
          local.set $i
        end
        br $c_lp
      end
    end
    local.get $hlen
    local.get $count
    local.get $rlen
    i32.mul
    i32.add
    local.get $count
    local.get $nlen
    i32.mul
    i32.sub
    local.tee $newlen
    call $ml_alloc
    local.set $out
    i32.const 0
    local.set $i
    local.get $out
    local.set $wp
    block $w_done
      loop $w_lp
        local.get $i
        local.get $hlen
        i32.ge_s
        br_if $w_done
        i32.const 0
        local.set $match
        local.get $i
        local.get $hlen
        local.get $nlen
        i32.sub
        i32.le_s
        if
          i32.const 1
          local.set $match
          i32.const 0
          local.set $j
          block $w_miss
            loop $w_inner
              local.get $j
              local.get $nlen
              i32.ge_s
              br_if $w_miss
              local.get $hptr
              local.get $i
              i32.add
              local.get $j
              i32.add
              i32.load8_u
              local.get $nptr
              local.get $j
              i32.add
              i32.load8_u
              i32.ne
              if
                i32.const 0
                local.set $match
                br $w_miss
              end
              local.get $j
              i32.const 1
              i32.add
              local.set $j
              br $w_inner
            end
          end
        end
        local.get $match
        if
          i32.const 0
          local.set $j
          block $r_done
            loop $r_lp
              local.get $j
              local.get $rlen
              i32.ge_s
              br_if $r_done
              local.get $wp
              local.get $j
              i32.add
              local.get $rptr
              local.get $j
              i32.add
              i32.load8_u
              i32.store8
              local.get $j
              i32.const 1
              i32.add
              local.set $j
              br $r_lp
            end
          end
          local.get $wp
          local.get $rlen
          i32.add
          local.set $wp
          local.get $i
          local.get $nlen
          i32.add
          local.set $i
        else
          local.get $wp
          local.get $hptr
          local.get $i
          i32.add
          i32.load8_u
          i32.store8
          local.get $wp
          i32.const 1
          i32.add
          local.set $wp
          local.get $i
          i32.const 1
          i32.add
          local.set $i
        end
        br $w_lp
      end
    end
    local.get $newlen
    global.set $__last_str_len
    local.get $out
    f64.convert_i32_u
  )
  ;; -- JSON helpers ----------------------------------------------------------
  ;; Encode a tracked list of f64 values as a JSON array "[n1,n2,...]".
  ;; Param: $ptr f64 (list header pointer).
  ;; Returns f64 ptr to heap string; $__last_str_len = byte length.
  (func $__json_encode_list (param $ptr f64) (result f64)
    (local $lptr i32) (local $n i32) (local $i i32) (local $ci i32)
    (local $v f64) (local $out i32) (local $wp i32)
    (local $int_part i64) (local $frac_scaled i64)
    (local $sptr i32) (local $slen i32)
    local.get $ptr
    i32.trunc_f64_u
    local.set $lptr
    local.get $lptr
    f64.load
    i32.trunc_f64_u
    local.set $n
    local.get $n
    i32.const 26
    i32.mul
    i32.const 3
    i32.add
    call $ml_alloc
    local.set $out
    local.get $out
    local.set $wp
    local.get $wp
    i32.const 91
    i32.store8
    local.get $wp
    i32.const 1
    i32.add
    local.set $wp
    i32.const 0
    local.set $i
    block $jl_done
      loop $jl_lp
        local.get $i
        local.get $n
        i32.ge_s
        br_if $jl_done
        local.get $i
        i32.const 0
        i32.gt_s
        if
          local.get $wp
          i32.const 44
          i32.store8
          local.get $wp
          i32.const 1
          i32.add
          local.set $wp
        end
        local.get $lptr
        local.get $i
        i32.const 8
        i32.mul
        i32.add
        i32.const 8
        i32.add
        f64.load
        local.set $v
        local.get $v
        f64.const 0.0
        f64.lt
        if
          local.get $wp
          i32.const 45
          i32.store8
          local.get $wp
          i32.const 1
          i32.add
          local.set $wp
          local.get $v
          f64.neg
          local.set $v
        end
        local.get $v
        f64.trunc
        local.get $v
        f64.eq
        local.get $v
        f64.const 1000000000000000.0
        f64.lt
        i32.and
        if
          local.get $v
          i64.trunc_f64_u
          local.set $int_part
          local.get $int_part
          call $__fmt_u64
          local.set $slen
          local.set $sptr
          i32.const 0
          local.set $ci
          block $ji_done
            loop $ji_lp
              local.get $ci
              local.get $slen
              i32.ge_s
              br_if $ji_done
              local.get $wp
              local.get $ci
              i32.add
              local.get $sptr
              local.get $ci
              i32.add
              i32.load8_u
              i32.store8
              local.get $ci
              i32.const 1
              i32.add
              local.set $ci
              br $ji_lp
            end
          end
          local.get $wp
          local.get $slen
          i32.add
          local.set $wp
        else
          local.get $v
          f64.trunc
          i64.trunc_f64_u
          local.set $int_part
          local.get $int_part
          call $__fmt_u64
          local.set $slen
          local.set $sptr
          i32.const 0
          local.set $ci
          block $jfi_done
            loop $jfi_lp
              local.get $ci
              local.get $slen
              i32.ge_s
              br_if $jfi_done
              local.get $wp
              local.get $ci
              i32.add
              local.get $sptr
              local.get $ci
              i32.add
              i32.load8_u
              i32.store8
              local.get $ci
              i32.const 1
              i32.add
              local.set $ci
              br $jfi_lp
            end
          end
          local.get $wp
          local.get $slen
          i32.add
          local.set $wp
          local.get $wp
          i32.const 46
          i32.store8
          local.get $wp
          i32.const 1
          i32.add
          local.set $wp
          local.get $v
          local.get $v
          f64.trunc
          f64.sub
          f64.const 1000000.0
          f64.mul
          f64.nearest
          i64.trunc_f64_u
          local.set $frac_scaled
          local.get $frac_scaled
          call $__fmt_frac6
          local.set $slen
          local.set $sptr
          i32.const 0
          local.set $ci
          block $jff_done
            loop $jff_lp
              local.get $ci
              local.get $slen
              i32.ge_s
              br_if $jff_done
              local.get $wp
              local.get $ci
              i32.add
              local.get $sptr
              local.get $ci
              i32.add
              i32.load8_u
              i32.store8
              local.get $ci
              i32.const 1
              i32.add
              local.set $ci
              br $jff_lp
            end
          end
          local.get $wp
          local.get $slen
          i32.add
          local.set $wp
        end
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $jl_lp
      end
    end
    local.get $wp
    i32.const 93
    i32.store8
    local.get $wp
    i32.const 1
    i32.add
    local.set $wp
    local.get $wp
    local.get $out
    i32.sub
    global.set $__last_str_len
    local.get $out
    f64.convert_i32_u
  )
  ;; -- Math helpers ----------------------------------------------------------
  ;; sin(x): range-reduced to [-pi/2, pi/2] before the 6-term Horner polynomial.
  (func $math_sin (param $x f64) (result f64)
    (local $u f64) (local $t f64)
    local.get $x
    f64.const 3.141592653589793
    f64.add
    local.set $x
    local.get $x
    local.get $x
    f64.const 6.283185307179586
    f64.div
    f64.floor
    f64.const 6.283185307179586
    f64.mul
    f64.sub
    local.set $x
    local.get $x
    f64.const 1.5707963267948966
    f64.gt
    if
      f64.const 3.141592653589793
      local.get $x
      f64.sub
      local.set $x
    end
    local.get $x
    f64.const -1.5707963267948966
    f64.lt
    if
      f64.const -3.141592653589793
      local.get $x
      f64.sub
      local.set $x
    end
    local.get $x
    local.get $x
    f64.mul
    local.set $u
    f64.const -2.5052108385441720e-8
    local.set $t
    local.get $u
    local.get $t
    f64.mul
    f64.const 2.7557319223985888e-6
    f64.add
    local.set $t
    local.get $u
    local.get $t
    f64.mul
    f64.const -1.9841269841269841e-4
    f64.add
    local.set $t
    local.get $u
    local.get $t
    f64.mul
    f64.const 8.3333333333333332e-3
    f64.add
    local.set $t
    local.get $u
    local.get $t
    f64.mul
    f64.const -1.6666666666666667e-1
    f64.add
    local.set $t
    local.get $u
    local.get $t
    f64.mul
    f64.const 1.0
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
  )
  ;; cos(x): range-reduced to [-pi/2, pi/2] with the correct reflection sign.
  (func $math_cos (param $x f64) (result f64)
    (local $u f64) (local $t f64) (local $sign f64)
    f64.const 1.0
    local.set $sign
    local.get $x
    f64.const 3.141592653589793
    f64.add
    local.set $x
    local.get $x
    local.get $x
    f64.const 6.283185307179586
    f64.div
    f64.floor
    f64.const 6.283185307179586
    f64.mul
    f64.sub
    local.set $x
    local.get $x
    f64.const 1.5707963267948966
    f64.gt
    if
      f64.const -1.0
      local.set $sign
      f64.const 3.141592653589793
      local.get $x
      f64.sub
      local.set $x
    end
    local.get $x
    f64.const -1.5707963267948966
    f64.lt
    if
      f64.const -1.0
      local.set $sign
      f64.const -3.141592653589793
      local.get $x
      f64.sub
      local.set $x
    end
    local.get $x
    local.get $x
    f64.mul
    local.set $u
    f64.const -2.7557319223985888e-7
    local.set $t
    local.get $u
    local.get $t
    f64.mul
    f64.const 2.4801587301587302e-5
    f64.add
    local.set $t
    local.get $u
    local.get $t
    f64.mul
    f64.const -1.3888888888888889e-3
    f64.add
    local.set $t
    local.get $u
    local.get $t
    f64.mul
    f64.const 4.1666666666666664e-2
    f64.add
    local.set $t
    local.get $u
    local.get $t
    f64.mul
    f64.const -5.0e-1
    f64.add
    local.set $t
    local.get $u
    local.get $t
    f64.mul
    f64.const 1.0
    f64.add
    local.get $sign
    f64.mul
  )
  ;; tan(x) = sin(x) / cos(x).
  (func $math_tan (param $x f64) (result f64)
    local.get $x
    call $math_sin
    local.get $x
    call $math_cos
    f64.div
  )
  ;; exp(x): 10-term Horner polynomial for e^x.
  (func $math_exp (param $x f64) (result f64)
    (local $t f64)
    f64.const 2.7557319223985888e-7
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    f64.const 2.7557319223985888e-6
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    f64.const 2.4801587301587302e-5
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    f64.const 1.9841269841269841e-4
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    f64.const 1.3888888888888889e-3
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    f64.const 8.3333333333333332e-3
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    f64.const 4.1666666666666664e-2
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    f64.const 1.6666666666666667e-1
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    f64.const 5.0e-1
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    f64.const 1.0
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    f64.const 1.0
    f64.add
  )
  ;; log(x): natural log via atanh series ln(x)=2*atanh((x-1)/(x+1)), 5 terms.
  (func $math_log (param $x f64) (result f64)
    (local $t f64) (local $t2 f64) (local $s f64)
    local.get $x
    f64.const 0.0
    f64.le
    if
      f64.const nan
      return
    end
    local.get $x
    f64.const 1.0
    f64.sub
    local.get $x
    f64.const 1.0
    f64.add
    f64.div
    local.set $t
    local.get $t
    local.get $t
    f64.mul
    local.set $t2
    local.get $t
    local.set $s
    local.get $t
    local.get $t2
    f64.mul
    f64.const 0.3333333333333333
    f64.mul
    local.get $s
    f64.add
    local.set $s
    local.get $t
    local.get $t2
    f64.mul
    local.get $t2
    f64.mul
    f64.const 0.2
    f64.mul
    local.get $s
    f64.add
    local.set $s
    local.get $t
    local.get $t2
    f64.mul
    local.get $t2
    f64.mul
    local.get $t2
    f64.mul
    f64.const 0.14285714285714285
    f64.mul
    local.get $s
    f64.add
    local.set $s
    local.get $t
    local.get $t2
    f64.mul
    local.get $t2
    f64.mul
    local.get $t2
    f64.mul
    local.get $t2
    f64.mul
    f64.const 0.1111111111111111
    f64.mul
    local.get $s
    f64.add
    local.set $s
    local.get $s
    f64.const 2.0
    f64.mul
  )
  ;; log2(x) = log(x) * (1/ln 2).
  (func $math_log2 (param $x f64) (result f64)
    local.get $x
    call $math_log
    f64.const 1.4426950408889634
    f64.mul
  )
  ;; log10(x) = log(x) * (1/ln 10).
  (func $math_log10 (param $x f64) (result f64)
    local.get $x
    call $math_log
    f64.const 0.4342944819032518
    f64.mul
  )
  ;; atan(x): 6-term series for |x| ≤ 1; uses atan(x)=π/2-atan(1/x) for |x|>1.
  (func $math_atan (param $x f64) (result f64)
    (local $t f64) (local $x2 f64) (local $neg i32) (local $r f64)
    i32.const 0
    local.set $neg
    local.get $x
    f64.const 0.0
    f64.lt
    if
      i32.const 1
      local.set $neg
      local.get $x
      f64.neg
      local.set $x
    end
    local.get $x
    f64.const 1.0
    f64.gt
    if
      f64.const 1.5707963267948966
      f64.const 1.0
      local.get $x
      f64.div
      call $math_atan
      f64.sub
      local.set $r
      local.get $neg
      if
        local.get $r
        f64.neg
        local.set $r
      end
      local.get $r
      return
    end
    local.get $x
    local.get $x
    f64.mul
    local.set $x2
    f64.const -0.09090909090909091
    local.set $t
    local.get $x2
    local.get $t
    f64.mul
    f64.const 0.1111111111111111
    f64.add
    local.set $t
    local.get $x2
    local.get $t
    f64.mul
    f64.const -0.14285714285714285
    f64.add
    local.set $t
    local.get $x2
    local.get $t
    f64.mul
    f64.const 0.2
    f64.add
    local.set $t
    local.get $x2
    local.get $t
    f64.mul
    f64.const -0.3333333333333333
    f64.add
    local.set $t
    local.get $x2
    local.get $t
    f64.mul
    f64.const 1.0
    f64.add
    local.set $t
    local.get $x
    local.get $t
    f64.mul
    local.set $r
    local.get $neg
    if
      local.get $r
      f64.neg
      local.set $r
    end
    local.get $r
  )
  ;; atan2(y, x) with quadrant adjustment.
  (func $math_atan2 (param $y f64) (param $x f64) (result f64)
    local.get $x
    f64.const 0.0
    f64.gt
    if
      local.get $y
      local.get $x
      f64.div
      call $math_atan
      return
    end
    local.get $x
    f64.const 0.0
    f64.lt
    if
      local.get $y
      f64.const 0.0
      f64.ge
      if
        local.get $y
        local.get $x
        f64.div
        call $math_atan
        f64.const 3.141592653589793
        f64.add
        return
      end
      local.get $y
      local.get $x
      f64.div
      call $math_atan
      f64.const 3.141592653589793
      f64.sub
      return
    end
    local.get $y
    f64.const 0.0
    f64.gt
    if
      f64.const 1.5707963267948966
      return
    end
    local.get $y
    f64.const 0.0
    f64.lt
    if
      f64.const -1.5707963267948966
      return
    end
    f64.const 0.0
  )
  ;; ── Number-to-string conversion ────────────────────────────────────────────
  ;; Convert f64 to heap-allocated UTF-8 decimal string.
  ;; Returns f64 ptr; sets $__last_str_len.
  (func $__str_from_f64 (param $v f64) (result f64)
    (local $neg i32) (local $is_int i32) (local $int i64)
    (local $buf i32) (local $pos i32) (local $b i32) (local $e i32) (local $ch i32)
    (local $frac f64) (local $d i32) (local $nd i32)
    i32.const 64
    call $ml_alloc
    local.set $buf
    i32.const 0
    local.set $pos
    local.get $v
    f64.const 0.0
    f64.lt
    if
      i32.const 1
      local.set $neg
      local.get $v
      f64.neg
      local.set $v
    end
    local.get $v
    f64.floor
    local.get $v
    f64.eq
    local.set $is_int
    local.get $v
    f64.floor
    i64.trunc_f64_u
    local.set $int
    local.get $int
    i64.const 0
    i64.eq
    if
      local.get $buf
      i32.const 48
      i32.store8
      i32.const 1
      local.set $pos
    else
      block $ib
        loop $il
          local.get $int
          i64.const 0
          i64.eq
          br_if $ib
          local.get $buf
          local.get $pos
          i32.add
          local.get $int
          i64.const 10
          i64.rem_u
          i32.wrap_i64
          i32.const 48
          i32.add
          i32.store8
          local.get $pos
          i32.const 1
          i32.add
          local.set $pos
          local.get $int
          i64.const 10
          i64.div_u
          local.set $int
          br $il
        end
      end
    end
    i32.const 0
    local.set $b
    local.get $pos
    i32.const 1
    i32.sub
    local.set $e
    block $rb
      loop $rl
        local.get $b
        local.get $e
        i32.ge_u
        br_if $rb
        local.get $buf
        local.get $b
        i32.add
        i32.load8_u
        local.set $ch
        local.get $buf
        local.get $b
        i32.add
        local.get $buf
        local.get $e
        i32.add
        i32.load8_u
        i32.store8
        local.get $buf
        local.get $e
        i32.add
        local.get $ch
        i32.store8
        local.get $b
        i32.const 1
        i32.add
        local.set $b
        local.get $e
        i32.const 1
        i32.sub
        local.set $e
        br $rl
      end
    end
    local.get $is_int
    i32.eqz
    if
      local.get $buf
      local.get $pos
      i32.add
      i32.const 46
      i32.store8
      local.get $pos
      i32.const 1
      i32.add
      local.set $pos
      local.get $v
      local.get $v
      f64.floor
      f64.sub
      local.set $frac
      i32.const 6
      local.set $nd
      block $fb
        loop $fl
          local.get $nd
          i32.const 0
          i32.le_s
          br_if $fb
          local.get $frac
          f64.const 10.0
          f64.mul
          local.tee $frac
          f64.floor
          i32.trunc_f64_u
          local.set $d
          local.get $buf
          local.get $pos
          i32.add
          local.get $d
          i32.const 48
          i32.add
          i32.store8
          local.get $pos
          i32.const 1
          i32.add
          local.set $pos
          local.get $frac
          local.get $frac
          f64.floor
          f64.sub
          local.set $frac
          local.get $nd
          i32.const 1
          i32.sub
          local.set $nd
          br $fl
        end
      end
      block $tb
        loop $tl
          local.get $pos
          i32.const 2
          i32.le_s
          br_if $tb
          local.get $buf
          local.get $pos
          i32.const 1
          i32.sub
          i32.add
          i32.load8_u
          i32.const 48
          i32.ne
          br_if $tb
          local.get $pos
          i32.const 1
          i32.sub
          local.set $pos
          br $tl
        end
      end
    end
    local.get $neg
    if
      local.get $pos
      i32.const 1
      i32.sub
      local.set $b
      block $sb
        loop $sl
          local.get $b
          i32.const 0
          i32.lt_s
          br_if $sb
          local.get $buf
          local.get $b
          i32.const 1
          i32.add
          i32.add
          local.get $buf
          local.get $b
          i32.add
          i32.load8_u
          i32.store8
          local.get $b
          i32.const 1
          i32.sub
          local.set $b
          br $sl
        end
      end
      local.get $buf
      i32.const 45
      i32.store8
      local.get $pos
      i32.const 1
      i32.add
      local.set $pos
    end
    local.get $pos
    global.set $__last_str_len
    local.get $buf
    f64.convert_i32_u
  )
  ;; ── List mutation helpers ───────────────────────────────────────────────────
  ;; $__list_append(list_ptr f64, elem f64) -> f64 new list_ptr
  ;; Layout: [offset 0: count_f64, offset 8: elem0, ...]
  (func $__list_append (param $lp f64) (param $elem f64) (result f64)
    (local $lpi i32) (local $cnt_i i32) (local $new_size i32)
    (local $np i32) (local $i i32)
    local.get $lp
    i32.trunc_f64_u
    local.set $lpi
    local.get $lpi
    f64.load
    i32.trunc_f64_u
    local.set $cnt_i
    local.get $cnt_i
    i32.const 2
    i32.add
    i32.const 8
    i32.mul
    local.set $new_size
    local.get $new_size
    call $ml_alloc
    local.set $np
    i32.const 0
    local.set $i
    block $cb
      loop $cl
        local.get $i
        local.get $cnt_i
        i32.const 1
        i32.add
        i32.ge_u
        br_if $cb
        local.get $np
        local.get $i
        i32.const 8
        i32.mul
        i32.add
        local.get $lpi
        local.get $i
        i32.const 8
        i32.mul
        i32.add
        f64.load
        f64.store
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $cl
      end
    end
    local.get $np
    local.get $cnt_i
    f64.convert_i32_u
    f64.const 1.0
    f64.add
    f64.store
    local.get $np
    local.get $cnt_i
    i32.const 1
    i32.add
    i32.const 8
    i32.mul
    i32.add
    local.get $elem
    f64.store
    ;; free the old list block (reclaimed by free list if size = 256)
    local.get $lpi
    local.get $cnt_i
    i32.const 1
    i32.add
    i32.const 8
    i32.mul
    call $ml_free
    local.get $np
    f64.convert_i32_u
  )
  ;; $__list_append_owned(list_ptr f64, elem f64) -> f64 new list_ptr with old storage released
  ;; Note: $__list_append already frees the old block, so this is now an alias.
  (func $__list_append_owned (param $lp f64) (param $elem f64) (result f64)
    local.get $lp
    local.get $elem
    call $__list_append
  )
  ;; $__list_pop(list_ptr f64) -> f64 last element (decrements count in-place)
  (func $__list_pop (param $lp f64) (result f64)
    (local $lpi i32) (local $cnt_i i32) (local $last f64)
    local.get $lp
    i32.trunc_f64_u
    local.set $lpi
    local.get $lpi
    f64.load
    i32.trunc_f64_u
    local.set $cnt_i
    local.get $lpi
    local.get $cnt_i
    i32.const 8
    i32.mul
    i32.add
    f64.load
    local.set $last
    local.get $lpi
    local.get $cnt_i
    i32.const 1
    i32.sub
    f64.convert_i32_u
    f64.store
    local.get $last
  )
  ;; $__list_extend(list_a f64, list_b f64) -> f64 new list_ptr
  (func $__list_extend (param $la f64) (param $lb f64) (result f64)
    (local $lai i32) (local $lbi i32) (local $ca i32) (local $cb i32)
    (local $nc i32) (local $np i32) (local $i i32)
    local.get $la
    i32.trunc_f64_u
    local.set $lai
    local.get $lb
    i32.trunc_f64_u
    local.set $lbi
    local.get $lai
    f64.load
    i32.trunc_f64_u
    local.set $ca
    local.get $lbi
    f64.load
    i32.trunc_f64_u
    local.set $cb
    local.get $ca
    local.get $cb
    i32.add
    local.tee $nc
    i32.const 1
    i32.add
    i32.const 8
    i32.mul
    call $ml_alloc
    local.set $np
    local.get $np
    local.get $nc
    f64.convert_i32_u
    f64.store
    i32.const 0
    local.set $i
    block $ab
      loop $al
        local.get $i
        local.get $ca
        i32.ge_u
        br_if $ab
        local.get $np
        local.get $i
        i32.const 1
        i32.add
        i32.const 8
        i32.mul
        i32.add
        local.get $lai
        local.get $i
        i32.const 1
        i32.add
        i32.const 8
        i32.mul
        i32.add
        f64.load
        f64.store
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $al
      end
    end
    i32.const 0
    local.set $i
    block $bb
      loop $bl
        local.get $i
        local.get $cb
        i32.ge_u
        br_if $bb
        local.get $np
        local.get $ca
        local.get $i
        i32.add
        i32.const 1
        i32.add
        i32.const 8
        i32.mul
        i32.add
        local.get $lbi
        local.get $i
        i32.const 1
        i32.add
        i32.const 8
        i32.mul
        i32.add
        f64.load
        f64.store
        local.get $i
        i32.const 1
        i32.add
        local.set $i
        br $bl
      end
    end
    local.get $np
    f64.convert_i32_u
  )
  ;; $__list_extend_owned(list_a f64, list_b f64) -> f64 new list_ptr with old lhs storage released
  (func $__list_extend_owned (param $la f64) (param $lb f64) (result f64)
    (local $lai i32) (local $ca i32) (local $newp f64)
    local.get $la
    i32.trunc_f64_u
    local.set $lai
    local.get $lai
    f64.load
    i32.trunc_f64_u
    local.set $ca
    local.get $la
    local.get $lb
    call $__list_extend
    local.set $newp
    local.get $lai
    local.get $ca
    i32.const 1
    i32.add
    i32.const 8
    i32.mul
    call $ml_free
    local.get $newp
  )
  ;; ── End WASI runtime ─────────────────────────────────────────────────────
  (func $cle_binaire_3 (export "cle_binaire_3")
    (param $gauche f64)
    (param $centre f64)
    (param $droite f64)
    (result f64)
    ;; @10:5
    local.get $gauche
    f64.const 4.0
    f64.mul  ;; op='*'
    local.get $centre
    f64.const 2.0
    f64.mul  ;; op='*'
    f64.add  ;; op='+'
    local.get $droite
    f64.add  ;; op='+'
    return
    f64.const 0  ;; implicit return
  )
  (func $sortie_wolfram (export "sortie_wolfram")
    (param $numero_regle f64)
    (param $motif f64)
    (result f64)
    (local $__mod_left_1 f64)
    (local $__re2 f64)
    (local $diviseur f64)
    (local $indice f64)
    (local $rang f64)
    ;; @14:5
    ;; let indice = ...
    local.get $motif
    local.set $__mod_left_1
    local.get $__mod_left_1
    local.get $__mod_left_1
    f64.const 8.0
    f64.div
    f64.floor
    f64.const 8.0
    f64.mul
    f64.sub
    local.set $indice
    ;; @15:5
    ;; let diviseur = ...
    f64.const 1.0
    local.set $diviseur
    ;; @16:5
    ;; for rang in range(...)
    f64.const 0.0
    local.set $rang
    local.get $indice
    local.set $__re2
    block $for_blk_2
      loop $for_lp_2
        local.get $rang
        local.get $__re2
        f64.ge
        br_if $for_blk_2
        ;; @17:9
        ;; diviseur = ...
        local.get $diviseur
        f64.const 2.0
        f64.mul  ;; op='*'
        local.set $diviseur
        local.get $rang
        f64.const 1
        f64.add
        local.set $rang
        br $for_lp_2
      end  ;; loop
    end  ;; block (for)
    ;; @18:5
    ;; f64 modulo
    local.get $numero_regle
    local.get $diviseur
    f64.div
    f64.floor
    local.get $numero_regle
    local.get $diviseur
    f64.div
    f64.floor
    f64.const 2.0
    f64.div
    f64.floor
    f64.const 2.0
    f64.mul
    f64.sub
    return
    f64.const 0  ;; implicit return
  )
  (func $cellule_wolfram (export "cellule_wolfram")
    (param $numero_regle f64)
    (param $gauche f64)
    (param $centre f64)
    (param $droite f64)
    (result f64)
    ;; @22:5
    local.get $numero_regle
    local.get $gauche
    local.get $centre
    local.get $droite
    call $cle_binaire_3
    call $sortie_wolfram
    return
    f64.const 0  ;; implicit return
  )
  (func $sortie_totalistique (export "sortie_totalistique")
    (param $somme_voisinage f64)
    (param $taille_alphabet f64)
    (param $canal f64)
    (result f64)
    ;; @26:5
    ;; if ...
    local.get $taille_alphabet
    f64.const 0.0
    f64.le
    if
      ;; @27:9
      f64.const 0.0
      return
    end  ;; if
    ;; @28:5
    ;; f64 modulo
    local.get $somme_voisinage
    local.get $canal
    f64.add  ;; op='+'
    local.get $somme_voisinage
    local.get $canal
    f64.add  ;; op='+'
    local.get $taille_alphabet
    f64.div
    f64.floor
    local.get $taille_alphabet
    f64.mul
    f64.sub
    return
    f64.const 0  ;; implicit return
  )
  (func $cellule_totalistique_3 (export "cellule_totalistique_3")
    (param $gauche f64)
    (param $centre f64)
    (param $droite f64)
    (param $taille_alphabet f64)
    (result f64)
    ;; @32:5
    local.get $gauche
    local.get $centre
    f64.add  ;; op='+'
    local.get $droite
    f64.add  ;; op='+'
    local.get $taille_alphabet
    f64.const 0.0
    call $sortie_totalistique
    return
    f64.const 0  ;; implicit return
  )
  (func $lire_bord_fixe (export "lire_bord_fixe")
    (param $valeur f64)
    (param $valeur_repli f64)
    (result f64)
    ;; @36:5
    local.get $valeur
    f64.const 0.0
    f64.ge
    if (result f64)
      local.get $valeur
    else
      local.get $valeur_repli
    end
    return
    f64.const 0  ;; implicit return
  )
  (func $taille_voisinage_normalisee (export "taille_voisinage_normalisee")
    (param $taille f64)
    (result f64)
    (local $__mod_left_3 f64)
    ;; @40:5
    ;; if ...
    local.get $taille
    f64.const 1.0
    f64.lt
    if
      ;; @41:9
      f64.const 1.0
      return
    end  ;; if
    ;; @42:5
    ;; if ...
    local.get $taille
    local.set $__mod_left_3
    local.get $__mod_left_3
    local.get $__mod_left_3
    f64.const 2.0
    f64.div
    f64.floor
    f64.const 2.0
    f64.mul
    f64.sub
    f64.const 0.0
    f64.eq
    if
      ;; @43:9
      local.get $taille
      f64.const 1.0
      f64.add  ;; op='+'
      return
    end  ;; if
    ;; @44:5
    local.get $taille
    return
    f64.const 0  ;; implicit return
  )
  (func $sortie_table_code (export "sortie_table_code")
    (param $code_sortie f64)
    (param $taille_alphabet f64)
    (result f64)
    (local $__mod_left_4 f64)
    ;; @48:5
    ;; if ...
    local.get $taille_alphabet
    f64.const 0.0
    f64.le
    if
      ;; @49:9
      f64.const 0.0
      return
    end  ;; if
    ;; @50:5
    local.get $code_sortie
    local.set $__mod_left_4
    local.get $__mod_left_4
    local.get $__mod_left_4
    local.get $taille_alphabet
    f64.div
    f64.floor
    local.get $taille_alphabet
    f64.mul
    f64.sub
    return
    f64.const 0  ;; implicit return
  )
  (func $validation_mode_regle (export "validation_mode_regle")
    (param $code_mode f64)
    (result f64)
    ;; @55:5
    local.get $code_mode
    f64.const 0.0
    f64.eq
    local.get $code_mode
    f64.const 1.0
    f64.eq
    local.get $code_mode
    f64.const 2.0
    f64.eq
    i32.or
    i32.or
    if (result f64)
      f64.const 1.0
    else
      f64.const 0.0
    end
    return
    f64.const 0  ;; implicit return
  )
)