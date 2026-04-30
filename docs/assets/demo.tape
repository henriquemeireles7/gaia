# docs/assets/demo.tape — vhs.charm.sh script for the README hero recording.
#
# Usage:
#   1. Install vhs: brew install vhs (or follow https://github.com/charmbracelet/vhs)
#   2. From repo root: vhs docs/assets/demo.tape
#   3. Output: docs/assets/demo.gif (60-second recording for README)
#
# This tape is a deterministic script. Real provider keys are not used —
# the recording uses the --dry-run mode of each verb so no live deploy is
# triggered. The footer overlay clarifies "demo with --dry-run" so viewers
# don't expect a real Railway URL.

Output docs/assets/demo.gif

Set Shell "bash"
Set FontSize 14
Set Width 1200
Set Height 720
Set Theme "Dracula"
Set TypingSpeed 40ms
Set PlaybackSpeed 1.0

Hide
Type "cd /tmp && [ -d weekend-saas ] && (cd weekend-saas && rm -rf .) || true"
Enter
Show

Sleep 500ms
Type "bun create gaia-app@latest weekend-saas"
Enter
Sleep 5s

Type "cd weekend-saas"
Enter
Sleep 500ms

# Show the user the mock app boots immediately — no vendor signup required.
Type "bun dev &"
Enter
Sleep 3s

Type "open http://localhost:3000"
Enter
Sleep 4s

# Show the path to going live.
Type "bun gaia live --dry-run --quiet"
Enter
Sleep 3s

Type "bun gaia deploy --dry-run --quiet"
Enter
Sleep 3s

Type "bun gaia smoke --url=https://weekend-saas.up.railway.app --dry-run"
Enter
Sleep 3s

# Hold the celebration banner on screen
Sleep 5s
