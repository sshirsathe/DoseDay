# calhacks2026
Project repo (Shruti, Diane, Marin, Sasha)

## Demo
- Open `index.html`. On step 1, upload a photo of a discharge sheet or click **Use sample photo**.
- The sample photo (synthetic data) lives at `samples/sample-discharge-photo.jpg`. **Use sample photo** loads it automatically when the page is served over http (e.g. GitHub Pages or `python -m http.server`). If you open the file straight from disk, click **Upload photo** and pick that file instead.
- Photos are read in the browser with Tesseract.js (loaded from a CDN, so you need internet access). The text it finds goes into the text box so you can fix mistakes before extracting.
