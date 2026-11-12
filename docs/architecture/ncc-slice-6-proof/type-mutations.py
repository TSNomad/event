# One mutation per @ts-expect-error directive in test/event-type-safety.ts, plus three controls.
T = 'src/types.ts'
E = 'src/EventStrategy.ts'
TRANSFORMER = "export type ActionTransformer<E extends Event = Event> = (...args: any[]) => E | null | Promise<E | null>;"
ATTACH = "  attach<E extends Event>(event: EventClass<E>, action: Listener<NoInfer<E>>, priority?: number): void;"
MUTATIONS = [
  ('TC1-must-catch: transformers answer anything', T, TRANSFORMER,
   "export type ActionTransformer<E extends Event = Event> = (...args: any[]) => unknown;",
   ['must answer the bound event class', 'forgets to return']),
  ('TC2-must-survive: comment only', T, TRANSFORMER, "// harmless\n" + TRANSFORMER, 'survive'),
  ('TC3-must-refuse: syntax break', T, TRANSFORMER, TRANSFORMER.replace('(...args', '((...args'), 'refuse'),
  ('TE1 EventClass needs no static getId', T,
   "export type EventClass<E extends Event = Event> = (abstract new (...args: any[]) => E) & {\n  getId(): string;\n};",
   "export type EventClass<E extends Event = Event> = (abstract new (...args: any[]) => E) & {};",
   ['without a static getId is not an EventClass']),
  ('TE2 the listener type is not tied to the class', E, ATTACH, ATTACH.replace('Listener<NoInfer<E>>', 'Listener<any>'),
   ["listener's event type must match"]),
  ('TE3 priority is untyped', E, ATTACH, ATTACH.replace('priority?: number', 'priority?: any'),
   ['priority is a number']),
  ('TE4 a transformer may answer any event', T, TRANSFORMER, TRANSFORMER.replace('=> E | null | Promise<E | null>', '=> Event | null | Promise<Event | null>'),
   ['must answer the bound event class']),
  ('TE5 a transformer may forget to return', T, TRANSFORMER, TRANSFORMER.replace('=> E | null |', '=> E | null | void |'),
   ['forgets to return']),
]
