// Needed for autoprefixer to work
require('es6-promise').polyfill();

var gulp = require('gulp');
var gulpif = require('gulp-if');
var fs = require('fs');
var $ = require('gulp-load-plugins')();
var runSequence = require('run-sequence'); // Remove if Gulp 4.0 is released

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
  imgDist: './dist/images'
};

/**
 * Global error handler for the Plumber plugin
 */

var errorHandler = function(err) {
  $.notify().write(err.toString());
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
 * Watch them files and fire up them tasks, yo
 */

gulp.task('watch', function() {
  $.watch([config.htmlSrc + '/**/*.html'], function() {
    gulp.start('compile-html');
  });

  $.watch([
    './src/**/*',
    config.htmlSrc + '/*.*',
    '!' + config.htmlSrc + '/*.html'
  ], function() {
      gulp.start('move-stuff');
  });

  $.watch([config.cssSrc + '/**/*.scss'], function() {
    gulp.start('compile-css');
  });

  $.watch([config.jsSrc + '/**/*.js'], function() {
    gulp.start('compile-js');
  });

  $.watch([config.imgSrc + '/**/*.*'], function() {
    gulp.start('optimize-images');
  });
});

/**
 * Templates using Nunjucks
 */

gulp.task('compile-html', function() {
  return gulp.src([config.htmlSrc + '/*.html'])
    .pipe($.plumber(errorHandler))
    .pipe($.nunjucks.compile())
    .pipe(gulp.dest(config.htmlDist))
    .pipe($.connect.reload());
});

/**
 * Copy all new folders in /src and files in the html folder that are not HTML
 * Todo: clean up this task and return a stream
 */

gulp.task('move-stuff', function() {
  gulp.src([
    './src/**/*',
    '!' + config.htmlSrc, '!' + config.htmlSrc + '/**/*',
    '!' + config.cssSrc, '!' + config.cssSrc + '/**/*',
    '!' + config.jsSrc, '!' + config.jsSrc + '/**/*',
    '!' + config.imgSrc, '!' + config.imgSrc + '/**/*'
  ])
  .pipe($.plumber(errorHandler))
  .pipe(gulp.dest('./dist'));

  // Non-HTML files in the HTML src folder
  gulp.src([config.htmlSrc + '/*.*', '!' + config.htmlSrc + '/*.html'])
    .pipe($.plumber(errorHandler))
    .pipe(gulp.dest(config.htmlDist));
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
 * Babel ES2015
 */

gulp.task('compile-js', function() {
  gulp.start('copy-js');

  //gulp.src(config.jsSrc + '/app.js')
  return gulp.src([config.jsSrc + '/**/*.js', '!' + config.jsSrc + '/vendor/**/*'])
    .pipe($.plumber(errorHandler))
    .pipe(gulpif(! config.production, $.sourcemaps.init()))
    .pipe($.babel({
      presets: ['es2015']
    }))
    .pipe($.browserify({
      insertGlobals: false,
      debug: true,
      paths: ['./node_modules', config.jsSrc]
    }))
    .pipe(gulpif(! config.production, $.sourcemaps.write()))
    .pipe(gulpif(config.production, $.uglify()))
    .pipe(gulp.dest(config.jsDist))
    .pipe($.connect.reload());
});

/**
 * Copy some JS folders like vendor
 */

gulp.task('copy-js', function() {
  return gulp.src(config.jsSrc + '/vendor/**/*')
    .pipe($.plumber(errorHandler))
    .pipe(gulp.dest(config.jsDist + '/vendor'));
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
          { moveElemsAttrsToGroup: false }
        ],
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
  gulp.start('dist');
});

/**
 * Check if the dist folder is empty, and if so first run the 'dist' task to fill it
 */

gulp.task('checkinstall', function() {
  if (! fs.existsSync(config.cssDist)) {
    gulp.start('dist');
  }
});

/**
 * Compile and move all the stuff to dist
 */

gulp.task('dist', function(callback) {
  runSequence(
    'clean', ['compile-html', 'move-stuff', 'compile-css', 'compile-js'],
    'optimize-images', callback
  );
});

/**
 * Default Gulp task is starting the webserver, livereload and watch
 */

gulp.task('default', ['checkinstall', 'server', 'watch']);
