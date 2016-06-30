// Needed for autoprefixer to work
require('es6-promise').polyfill();

const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const gulpif = require('gulp-if');
const runSequence = require('run-sequence'); // Remove if Gulp 4.0 is released
const fs = require('fs');
const glob = require('glob');
const nunjucks = require('gulp-nunjucks-render');

const browserify = require('browserify');
const watchify = require('watchify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');

/**
 * Gulp tasks config
 */

const config = {
  production: false,
  livereload: true,
  autoprefix: 'last 2 versions',
  htmlSrc: './src/html',
  rootSrc: './src/html/root',
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

const bundler = browserify({
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

const errorHandler = function(err) {
  $.notify().write(err);
  this.emit('end');
};

/**
 * Connect webserver
 */

gulp.task('server', () => {
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

gulp.task('watch', () => {
  $.watch(config.htmlSrc + '/**/*.html', () => {
    gulp.start('compile-html');
  });

  $.watch(config.rootSrc + '/**/*.*', () => {
    gulp.start('copy-root');
  });

  $.watch(config.cssSrc + '/**/*.scss', () => {
    gulp.start('compile-css');
  });

  $.watch(config.jsSrc + '/vendor/**/*', () => {
    gulp.start('copy-js');
  });

  bundler.on('update', () => {
    gulp.start('compile-js');
  });
  // Start initial compilation or Watchify will not work
  gulp.start('compile-js');

  $.watch(config.imgSrc + '/**/*.*', () => {
    gulp.start('optimize-images');
  });
});

/**
 * Templates using Nunjucks
 */

gulp.task('compile-html', () => {
  return gulp.src([
      config.htmlSrc + '/**/*.html',
      '!' + config.htmlSrc + '/layouts/**/*.html',
      '!' + config.htmlSrc + '/partials/**/*.html'
    ])
    .pipe($.plumber(errorHandler))
    .pipe(nunjucks({ path: [config.htmlSrc] }))
    .pipe(gulp.dest(config.htmlDist))
    .pipe($.connect.reload());
});

/**
 * Copy all files in the root folder to the dist root
 */

gulp.task('copy-root', () => {
  return gulp.src(config.rootSrc + '/**/*', { dot: true })
    .pipe(gulp.dest(config.htmlDist));
});

/**
 * SCSS and autoprefixer
 */

gulp.task('compile-css', () => {
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

gulp.task('copy-js', () => {
  return gulp.src(config.jsSrc + '/vendor/**/*')
    .pipe($.plumber(errorHandler))
    .pipe(gulpif(config.production, $.uglify({ preserveComments: 'license' })))
    .pipe(gulp.dest(config.jsDist + '/vendor'));
});

/**
 * Babel ES2015
 */

gulp.task('compile-js', () => {
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
    .pipe(gulpif(config.production, $.uglify({
      mangle: false,
      compress: {
        unused: false
      }
    })))
    .pipe(gulp.dest(config.jsDist))
    .pipe($.connect.reload());
});

/**
 * Image optimization
 */

gulp.task('optimize-images', () => {
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

gulp.task('clean', () => {
  return gulp.src('./dist/*', { read: false })
    .pipe($.plumber(errorHandler))
		.pipe($.clean());
});

/**
 * Set files ready for production
 */

gulp.task('prod', () => {
  config.production = true;

  return gulp.start('dist');
});

/**
 * Check if the dist folder is empty, and if so first run the 'dist' task to fill it
 */

gulp.task('checkinstall', () => {
  if (! fs.existsSync(config.cssDist)) {
    return gulp.start('dist');
  }

  return;
});

/**
 * Compile and move all the stuff to dist
 */

gulp.task('dist', (callback) => {
  // Run tasks in parallel
  runSequence(
    'clean',
    ['compile-html', 'compile-css', 'copy-js', 'copy-root', 'compile-js', 'optimize-images'],
    callback
  );
});

/**
 * Default Gulp task is starting the webserver, livereload and watch
 */

gulp.task('default', ['checkinstall', 'server', 'watch']);
