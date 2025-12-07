# Constraints

Runs enforce difficulty constraints per act before generating challenges:
- **Act 1**: songs difficulty `<= 3`
- **Act 2**: songs difficulty `<= 5`
- **Act 3**: songs difficulty `>= 3`

Challenge pools are also sized per act:
- **Act 1**: 9–12 songs
- **Act 2**: 6–9 songs
- **Act 3**: 3–5 songs

If filters would empty a pool, the generator falls back to the unfiltered list for that act.
