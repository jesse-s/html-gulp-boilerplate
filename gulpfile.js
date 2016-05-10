// Needed for autoprefixer to work
require('es6-promise').polyfill();

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var gulpif = require('gulp-if');
var runSequence = require('run-sequence'); // Remove if Gulp 4.0 is released
var fs = require('fs');
var glob = require('glob');
var nunjucks = require('gulp-nunjucks-html');

var browserify = require('browserify');
var watchify = require('watchify');
var babelify = require('babelify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');

/**
 * Gulp tasks config
 */

var config = {
  production: false,
  livereload: true,
  autoprefix: 'last 2 versions',
  htmlSrc: './src/html',
  htmlDist: './dist',
  cssSrc: './src/sass',
  cssDist: './dist/css',
  jsSrc: './src/js',
  jsDist: './dist/js',
  imgSrc: './src/images',
  imgDist: './dist/images',
};

/**
 * Bundler init
 */

var bundler = browserify({
  entries: [config.jsSrc + '/app.js'],
  debug: ! config.production,
  paths: ['./node_modules', config.jsSrc], //config.jsDist
  cache: {},
  packageCache: {},
  plugin: [watchify]
})
.transform(babelify, {
  presets: ['es2015']
});

/**
 * Global error handler for the Plumber plugin
 */

var errorHandler = function(err) {
  $.notify().write(err);
  this.emit('end');
};

/**
 * Connect webserver
 */

gulp.task('server', function () {
  $.connect.server({
    root: 'dist',
    host: '0.0.0.0',
    port: 8080,
    livereload: config.livereload
  });
});

/**
 * Watch all project files and execute the relevant tasks
 */

gulp.task('watch', function() {
  $.watch(config.htmlSrc + '/**/*.*', function() {
    gulp.start('compile-html');
  });

  $.watch(config.cssSrc + '/**/*.scss', function() {
    gulp.start('compile-css');
  });

  $.watch(config.jsSrc + '/vendor/**/*', function() {
    gulp.start('copy-js');
  });

  //$.watch(config.jsSrc + '/app.js', function() {
  //  gulp.start('compile-js');
  //});
  bundler.on('update', function() {
    gulp.start('compile-js');
  });
  // Start initial compilation or Watchify will not work
  gulp.start('compile-js');

  $.watch(config.imgSrc + '/**/*.*', function() {
    gulp.start('optimize-images');
  });
});

/**
 * Templates using Nunjucks
 */

gulp.task('compile-html', function() {
  return gulp.src(config.htmlSrc + '/*.*')
    .pipe($.plumber(errorHandler))
    .pipe(nunjucks({ searchPaths: [config.htmlSrc] }))
    .pipe(gulp.dest(config.htmlDist))
    .pipe($.connect.reload());
});

/**
 * SCSS and autoprefixer
 */

gulp.task('compile-css', function() {
  return gulp.src(config.cssSrc + '/app.scss')
    .pipe($.plumber(errorHandler))
    .pipe(gulpif(! config.production, $.sourcemaps.init()))
    .pipe($.sass())
    .pipe($.autoprefixer(config.autoprefix))
    .pipe(gulpif(! config.production, $.sourcemaps.write()))
    .pipe(gulpif(config.production, $.cssnano()))
    .pipe(gulp.dest(config.cssDist))
    .pipe($.connect.reload());
});

/**
 * Copy the vendor JS folder to dist
 */

gulp.task('copy-js', function() {
  return gulp.src(config.jsSrc + '/vendor/**/*')
    .pipe($.plumber(errorHandler))
    .pipe(gulpif(config.production, $.uglify()))
    .pipe(gulp.dest(config.jsDist + '/vendor'));
});

/**
 * Babel ES2015
 */

gulp.task('compile-js', function() {
  /*glob.sync(config.jsDist + '/vendor/*').forEach(function(filePath) {
    if (fs.statSync(filePath).isDirectory() === false) {
      bundler.external(filePath);
    }
  });*/

  return bundler.bundle()
    .on('error', errorHandler)
    .pipe(source('app.js'))
    //.pipe($.plumber(errorHandler))
    .pipe(buffer())
    .pipe(gulpif(config.production, $.uglify()))
    .pipe(gulp.dest(config.jsDist))
    .pipe($.connect.reload());
});

/**
 * Image optimization
 */

gulp.task('optimize-images', function() {
  return gulp.src(config.imgSrc + '/**/*.*')
    .pipe($.plumber(errorHandler))
    .pipe($.imagemin({
        optimizationLevel: 5,
        progressive: true,
        interlaced: true,
        multipass: true,
        svgoPlugins: [
          { removeViewBox: false },
          { cleanupIDs: false },
          { removeUselessStrokeAndFill: false },
          { removeEmptyAttrs: false },
          { collapseGroups: false },
          { moveElemsAttrsToGroup: false },
          { moveGroupAttrsToElems: false }
        ]
    }))
    .pipe(gulp.dest(config.imgDist))
    .pipe($.connect.reload());
});

/**
 * Dist folder cleanup
 */

gulp.task('clean', function() {
  return gulp.src('./dist/*', { read: false })
    .pipe($.plumber(errorHandler))
		.pipe($.clean());
});

/**
 * Set files ready for production
 */

gulp.task('prod', function() {
  config.production = true;

  return gulp.start('dist');
});

/**
 * Check if the dist folder is empty, and if so first run the 'dist' task to fill it
 */

gulp.task('checkinstall', function() {
  if (! fs.existsSync(config.cssDist)) {
    return gulp.start('dist');
  }
});

/**
 * Compile and move all the stuff to dist
 */

gulp.task('dist', function(callback) {
  // Run tasks in parallel
  runSequence(
    'clean', ['compile-html', 'compile-css', 'copy-js', 'compile-js',
    'optimize-images'], callback
  );
});

/**
 * Default Gulp task is starting the webserver, livereload and watch
 */

gulp.task('default', ['checkinstall', 'server', 'watch']);
