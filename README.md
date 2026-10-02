# Extension UI branch

This branch owns the right-side YouTube review panel. The panel mounts above suggested videos on watch pages, follows YouTube single-page navigation, and automatically adapts to the active light or dark theme.

The UI exposes `YouTubeReviewPanel` with `setState`, `renderReport`, and `reset` methods. It also emits `youtube-review:analyze` and `youtube-review:settings` events so the integration branch can attach behavior without coupling API logic to rendering.
