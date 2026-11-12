# One mutation per @ts-expect-error directive in test/event-type-safety.ts, plus three controls.
T = 'src/types.ts'
E = 'src/EventStrategy.ts'
A = 'src/ActionBindingStrategy.ts'
TRANSFORMER = "export type ActionTransformer<E extends Event = Event> = (\n  ...args: any[]\n) => NotThenable<E> | null | Promise<NotThenable<E> | null>;"
ANSWER = ") => NotThenable<E> | null | Promise<NotThenable<E> | null>;"
ATTACH = "  attach<E extends Event>(event: EventClass<E>, action: Listener<NoInfer<E>>, priority?: number): void;"
MUTATIONS = [
  ('TC1-must-catch: transformers answer anything', T, ANSWER, ") => unknown;",
   ['must answer the bound event class', 'a transformer that forgets to return', 'with a string id', 'nor with the Event type']),
  ('TC2-must-survive: comment only', T, TRANSFORMER, "// harmless\n" + TRANSFORMER, 'survive'),
  ('TC3-must-refuse: syntax break', T, ANSWER, ") => NotThenable<E> | null | Promise<NotThenable<E> | null>;;(", 'refuse'),
  ('TE1 EventClass needs no static getId', T,
   "export type EventClass<E extends Event = Event> = (abstract new (...args: any[]) => E) & {\n  getId(): string;\n};",
   "export type EventClass<E extends Event = Event> = (abstract new (...args: any[]) => E) & {};",
   ['without a static getId is not an EventClass']),
  ('TE2 the listener type is not tied to the class', E, ATTACH, ATTACH.replace('Listener<NoInfer<E>>', 'Listener<any>'),
   ["listener's event type must match"]),
  ('TE3 priority is untyped', E, ATTACH, ATTACH.replace('priority?: number', 'priority?: any'),
   ['priority is a number']),
  ('TE4 a transformer may answer any event', T, ANSWER, ") => NotThenable<Event> | null | Promise<NotThenable<Event> | null>;",
   ['must answer the bound event class']),
  ('TE5 a sync transformer may forget to return', T, ANSWER, ") => NotThenable<E> | null | void | Promise<NotThenable<E> | null>;",
   ['a transformer that forgets to return']),
  ('TE6 a promise counts as an event', T, "export type NotThenable<E> = E & { readonly then?: never };", "export type NotThenable<E> = E;",
   ['with a string id', 'nor with the Event type']),
  ('TE7 a string id may omit the transformer', A,
   "  bindAction<E extends Event = Event>(eventId: string, action: string, transformer: ActionTransformer<E>): void;",
   "  bindAction<E extends Event = Event>(eventId: string, action: string, transformer?: ActionTransformer<E>): void;",
   ['a string id needs a transformer']),
]
