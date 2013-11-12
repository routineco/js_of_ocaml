let code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
let code_rev =
  let a = Array.make 127 (-1) in
  String.iteri (fun i c -> a.(Char.code c) <- i) code;
  a

let vlq_base_shift = 5
(* binary: 100000 *)
let vlq_base = 1 lsl vlq_base_shift
(* binary: 011111 *)
let vlq_base_mask = vlq_base - 1
(* binary: 100000 *)
let vlq_continuation_bit = vlq_base

let toVLQSigned v =
  if v < 0
  then ((-v) lsl 1) + 1
  else (v lsl 1);;

(* assert (toVLQSigned 1 = 2); *)
(* assert (toVLQSigned 2 = 4); *)
(* assert (toVLQSigned (-1) = 3); *)
(* assert (toVLQSigned (-2) = 5);; *)

let fromVLQSigned v =
  let is_neg = (v land 1) = 1 in
  let shift = v lsr 1 in
  if is_neg then - shift else shift

(* assert (fromVLQSigned 2 = 1); *)
(* assert (fromVLQSigned 4 = 2); *)
(* assert (fromVLQSigned 3 = -1); *)
(* assert (fromVLQSigned 5 = -2);; *)

let add_char buf x = Buffer.add_char buf code.[x]

let rec encode' buf x =
  let digit = x land vlq_base_mask in
  let rest = x lsr vlq_base_shift in
  if rest = 0
  then add_char buf digit
  else begin
    add_char buf (digit lor vlq_continuation_bit);
    encode' buf rest;
  end

let encode b x =
  let vql = toVLQSigned x in
  encode' b vql

let encode_l b l = List.iter (encode b) l

let rec decode' acc s start pos =
  let digit = code_rev.(Char.code s.[pos]) in
  let cont = digit land vlq_continuation_bit = vlq_continuation_bit in
  let digit = digit land vlq_base_mask in
  let acc = acc + (digit lsl ((pos - start) * vlq_base_shift)) in
  if cont
  then decode' acc s start (succ pos)
  else acc,succ pos

let decode s p =
  let d,i = decode' 0 s p p in
  fromVLQSigned d,i

let decode_pos s =
  let sl = String.length s in
  let rec aux pos acc =
    if List.length acc > 10 then assert false;
    let d,i = decode s pos in
    if i = sl
    then List.rev (d::acc)
    else aux i (d::acc)
  in aux 0 []


(* let _ = assert ( *)
(*   let l = [0;0;16;1] in *)
(*   decode_pos (encode_pos l) = l); *)
