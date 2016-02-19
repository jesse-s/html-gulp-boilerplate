// Needed for autoprefixer to work
require('es6-promise').polyfill();

var gulp = require('gulp');
var gulpif = require('gulp-if');
var del = require('del');
var fs = require('fs');
var $ = require('gulp-load-plugins')();

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
 * Global error handler. Don't crash on error, but show nofication
 */

var handleError = function(err) {
  return $.notify().write(err);
};

/**
 * Connect webserver
 */

gulp.task('server', function () {
  $.connect.server({
    root: 'dist',
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
  gulp.src([config.htmlSrc + '/*.html'])
    .pipe($.nunjucks.compile().on('error', handleError))
    .pipe(gulp.dest(config.htmlDist))
    .pipe($.connect.reload());
});

/**
 * Copy all new folders in /src and files in the html folder that are not HTML
 */

gulp.task('move-stuff', function() {
  // Might have to clean this up..
  gulp.src([
    './src/**/*',
    '!' + config.htmlSrc, '!' + config.htmlSrc + '/**/*',
    '!' + config.cssSrc, '!' + config.cssSrc + '/**/*',
    '!' + config.jsSrc, '!' + config.jsSrc + '/**/*',
    '!' + config.imgSrc, '!' + config.imgSrc + '/**/*'
  ])
  .pipe(gulp.dest('./dist'));

  // Non-HTML files in the HTML src folder
  gulp.src([config.htmlSrc + '/*.*', '!' + config.htmlSrc + '/*.html'])
    .pipe(gulp.dest(config.htmlDist));
});

/**
 * SCSS and autoprefixer
 */

gulp.task('compile-css', function() {
  gulp.src(config.cssSrc + '/app.scss')
    .pipe(gulpif(! config.production, $.sourcemaps.init()))
    .pipe($.sass().on('error', handleError))
    .pipe($.autoprefixer(config.autoprefix).on('error', handleError))
    .pipe(gulpif(! config.production, $.sourcemaps.write()))
    .pipe(gulp.dest(config.cssDist))
    .pipe($.connect.reload());
});

/**
 * Babel ES2015
 */

gulp.task('compile-js', function() {
  //gulp.src(config.jsSrc + '/app.js')
  gulp.src([config.jsSrc + '/**/*.js', '!' + config.jsSrc + '/vendor/**/*'])
    .pipe(gulpif(! config.production, $.sourcemaps.init()))
    .pipe($.babel({
      presets: ['es2015']
    }).on('error', handleError))
    .pipe($.browserify({
      insertGlobals: false,
      debug: true,
      paths: ['./node_modules', config.jsSrc]
    }).on('error', handleError))
    .pipe(gulpif(! config.production, $.sourcemaps.write()))
    .pipe(gulp.dest(config.jsDist))
    .pipe($.connect.reload());

  gulp.start('copy-js');
});

/**
 * Copy some JS folders like vendor
 */

gulp.task('copy-js', function() {
  gulp.src(config.jsSrc + '/vendor/**/*')
    .pipe(gulp.dest(config.jsDist + '/vendor'));
});

/**
 * Image optimization
 */

gulp.task('optimize-images', function() {
  gulp.src(config.imgSrc + '/**/*.*')
    .pipe($.imagemin({
        optimizationLevel: (config.production ? 6 : 5),
        progressive: true,
        interlaced: true,
        multipass: true,
    }).on('error', handleError))
    .pipe(gulp.dest(config.imgDist))
    .pipe($.connect.reload());
});

/**
 * Dist folder cleanup
 */

gulp.task('clean', function() {
  del('./dist/**/*');
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

gulp.task('dist', ['clean', 'compile-html', 'move-stuff', 'compile-css',
  'compile-js', 'optimize-images']);

/**
 * Default Gulp task is starting the webserver, livereload and watch
 */

gulp.task('default', ['checkinstall', 'server', 'watch']);
