# Clockface (Tauri overlay clock)

Always-on-top, transparent clock overlay built with Tauri + vanilla HTML/CSS/JS Very light weight compared to others with great UI customisability.  

![](example.gif)
This version supports custom clock faces! all you need is to modify the src folder near the exe. and Can use your own ai generated clocks.  
**Pro tip:** You can run calculator,or any ui that runs in your local host with this.

The previous further lighter version having only default clock is available as well named clockface v1 exe in release.

# Installation
Unzip the v2 zip downloaded from releases to your favourite location and run the exe for default aesthetic clock. For custom clocks provide the src folder to AI as context and request your own designs..

## Usage

- Drag anywhere on the window to reposition.
- The default clock comes with the below features(custom clocks must implement their own)
- Press 'b' after clicking the clock to show a black background so you can move it as you wish.
- Open settings: `Ctrl+,`
- Close settings: `Esc`
------------

# Development
## Run

- Dev (hot reload): `npm run tauri dev`
- Release build: `npm run tauri build`


Settings persist via `localStorage`[If you make own face use local storage for persistance of the website settings].
