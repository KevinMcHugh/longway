# Constraints

Runs enforce difficulty constraints per act before generating challenges:
- **Act 1**: songs difficulty `<= 3`
- **Act 2**: songs difficulty `<= 5`
- **Act 3**: songs difficulty `>= 3`

Challenge pools are also sized per act:
- **All acts**: 2–5 songs per challenge

If filters would empty a pool, the generator falls back to the unfiltered list for that act.
