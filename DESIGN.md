# Design Decisions

A lot of the design choices in StarSet came from trying to reduce friction during real use.

## No Start/Stop — Sessions Span the Day

Most workout apps force you to explicitly start and end a session. StarSet skips that entirely. A session is just a day. Open a workout, log sets, and you're done. There's no timer running, no "end workout" confirmation, no anxiety about forgetting to stop something.

This also means you can come back later in the day and add more sets without "reopening" anything. The session is always there for the current date.

## Weekly Calendar Strip

A scrollable weekly calendar strip sits at the top of the workout screen. Tapping any date navigates to that day's session instantly. This makes it trivial to check what you did last Tuesday or review the past week without digging through a separate history screen.

The current day is highlighted, and dates with logged sessions are visually marked so the user can see training frequency at a glance.

## Single-Screen Workout Logging

The main workout screen is designed so the user can stay in context. Instead of bouncing between multiple pages to view an exercise, log a set, add notes, and check recent history, the important actions live close together. New set rows spawn automatically as the user types, there's no "add set" button required for the common case.

That reduces cognitive overhead and keeps the app feeling lightweight during a workout.

## History Near the Point of Action

Each exercise card shows a summary from the last session directly in the logging flow >> what weight was used, how many reps, and any notes. The user doesn't need to mentally switch into a separate "analytics mode" just to remember what they lifted last time.

Tapping the history summary opens the full exercise history screen with progression charts and a calendar view. This keeps the main screen clean while making deeper data one tap away.

This was a deliberate choice: historical context is most useful right when the next set is being entered.

## Smart Notes with Contextual Placeholder

Each exercise card has a notes field. If the user adds notes, those notes are saved with the session and show up in history. If the user doesn't type anything, the placeholder text shows a summary of today's logged sets > so even the empty state provides useful information rather than just a blank field.

## Exercises Shared Across Workouts

Workouts in StarSet act like folders. The same exercise (e.g., "Bench Press") can appear in multiple workouts, and all its history stays unified. You don't end up with fragmented progress data just because you reorganized your routine or train the same movement on different days.

This was a deliberate product choice that required a specific data architecture (many-to-many junction table) but makes the user experience much cleaner long-term.

## Fast Add Flow Over Heavy Setup

Adding an exercise is meant to feel quick and forgiving rather than like filling out a formal setup form. The search is inline, exercises are matched by name to prevent duplicates, and the type/unit selection is minimal. The goal was to reduce the feeling that the app is asking the user to "configure a system" before they can actually train.

## Calendar + Chart Views for Different Thinking Modes

I included both chart and calendar history because they answer different questions.

- Charts help with progression over time
- Calendar views help users think in terms of specific training days and recall what happened on a given date

That combination makes history more usable than a single generic log list.

## Dark, Minimal Interface

The visual style is intentionally minimal and high-contrast:

- Fewer competing elements
- Emphasis on workout content
- Cleaner visual hierarchy
- Less "app chrome" around the actual task

The goal was to make the app feel focused and calm rather than crowded.

## Repeated-Use Interaction Design

This app is not meant to be opened occasionally and explored. It is meant to be used repeatedly, often, and quickly. That shaped small UI decisions like:

- Keeping common actions close to the main screen
- Minimizing navigation depth
- Making progress/history easy to glance at
- Favoring immediate local saves over confirmation-heavy flows
