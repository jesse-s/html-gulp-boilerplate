# HTML Gulp boilerplate
A workflow boilerplate to get started with modern front end development using Gulp.

## About
This boilerplate offers a basic web server, HTML templating with Nunjucks, ES2015 support, SCSS support with autoprefixer, image optimization and automatic reloading using Gulp. `import` is currently unsupported for ES2015. Generated JS and CSS contain sourcemaps in development. The SCSS library Bourbon with Neat and (modified) Bitters is included and integrated by default.

A basic icon template for Sketch can be found in the `/resources` folder for the gazillion icons and images that are available to use on the web these days.

Also included is a .editorconfig file taken from the [HTML5 boilerplate](https://github.com/h5bp/html5-boilerplate) and a SCSS lint file which is a slight variation of the [18F CSS styleguide](https://pages.18f.gov/frontend/css-coding-styleguide/) lint file.

## Requirements
* node.js version 0.10.0 or higher
* Gulp

## Installing
Clone the repository with `git clone https://github.com/jesse-s/html-gulp-boilerplate`. Then run `npm install` inside the root directory of the project to install all dependencies. Then run the `gulp` task to get busy developing!

## Available Gulp tasks
* `gulp` - The default Gulp task combines the web server and file watcher in one
* `gulp server` - Run the Connect web server
* `gulp watch` - Watch source files for changes and compile the assets to the dist folder
* `gulp dist` - Compile assets to the dist folder
* `gulp prod` - Same as `gulp dist`, but for production use
* `gulp clean` - Clean out the whole dist folder

## Todo
* `import` support for ES2015, or an alternative solution
* Clean and optimize the gulpfile