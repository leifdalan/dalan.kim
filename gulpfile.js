var gulp = require('gulp'),
  $ = require('gulp-load-plugins')(),
  cp = require('child_process'),
  browserSync = require('browser-sync'),
  fs = require('fs'),
  pngquant = require('imagemin-pngquant'),
  psi = require('psi'),
  aws = JSON.parse(fs.readFileSync('./aws.json'));

/**
 * Wait for jekyll-build, then launch the Server
 */
gulp.task('browser-sync', ['sass', 'browserify'], function() {
  browserSync({
    server: {
      baseDir: 'dist',
    }
  });
});

gulp.task('browserify', function() {
  // Single entry point to browserify
  return gulp.src('src/js/main.js')
    .pipe($.browserify({
      paths: ['./node_modules', './jssrc/libs', './jssrc/modules'],
      debug: true
    }))
    .pipe(gulp.dest('./dist/js'))
    .pipe($.autopolyfiller('main-ie8.js', {
      browsers: ['ie 8'],
      exclude: ['Window.prototype.matchMedia'], //picturefill comes with matchMedia polyfill
    }))
    .pipe(gulp.dest('./dist/js'))
});

gulp.task('reload', ['browserify', 'move'], function() {
  browserSync.reload();
});

// Compile SASS
gulp.task('sass', function() {
  return gulp.src('src/css/main.scss')
    .pipe($.sourcemaps.init())
    .pipe($.sass())
    .pipe($.sourcemaps.write({
      includeContent: false
    }))
    .pipe($.sourcemaps.init({
      loadMaps: true
    }))
    .pipe($.autoprefixer())
    .on('error', function(err) {
      console.log(err)
    })
    .pipe($.sourcemaps.write('.'))
    .pipe(gulp.dest('dist/css'))
    .pipe(gulp.dest('css'))
    .pipe($.filter('**/*.css'))
    .pipe(browserSync.reload({
      stream: true
    }))
    .pipe(gulp.dest('dist/css')); // Copy to static dir
});

// Run static file server
gulp.task('serve', function() {
  browserSync({
    server: {
      baseDir: 'dist'
    }
  });
});

gulp.task('move', function() {
  return gulp.src('src/**/*.html')
    .pipe(gulp.dest('dist'))
});

/**
 * Watch scss files for changes & recompile
 * Watch html/md files, run jekyll & reload BrowserSync
 */
gulp.task('watch', function() {
  gulp.watch('src/css/*.scss', ['sass']);
  gulp.watch(['src/**/*.js'], ['reload']);
  gulp.watch(['src/**/*.html', '*/*.html', '*/*.md', '!dist/**', '!node_modules/*/**', '!node_modules/*/**', '!dist/*/**'], ['reload']);
});

/**
 * Default task, running just `gulp` will compile the sass,
 * compile the jekyll site, launch BrowserSync & watch files.
 */
gulp.task('default', ['move', 'browser-sync', 'watch']);

//begin image sub-tasks

gulp.task('image_resize_2400', function() {
  return gulp.src('./src/img/*')
    .pipe($.imageResize({
      width: 2400,
      height: 2400,
      crop: false,
      upscale: false
    }))
    .pipe($.rename(function(path) {
      path.basename += "-2400";
    }))
    .pipe(gulp.dest('./dist/img/'));
});

gulp.task('image_resize_1200', function() {
  return gulp.src('./src/img/*')
    .pipe($.imageResize({
      width: 1200,
      height: 1200,
      crop: false,
      upscale: false
    }))
    .pipe($.rename(function(path) {
      path.basename += "-1200";
    }))
    .pipe(gulp.dest('./dist/img/'));
});
gulp.task('image_resize_768', function() {
  return gulp.src('./src/img/*')
    .pipe($.imageResize({
      width: 768,
      height: 768,
      crop: false,
      upscale: false
    }))
    .pipe($.rename(function(path) {
      path.basename += "-768";
    }))
    .pipe(gulp.dest('./dist/img/'));
});

gulp.task('image_resize_480', function() {
  return gulp.src('./src/img/*')
    .pipe($.imageResize({
      width: 480,
      height: 480,
      crop: false,
      upscale: false
    }))
    .pipe($.rename(function(path) {
      path.basename += "-480";
    }))
    .pipe(gulp.dest('./dist/img/'));
});

gulp.task('image_resize_320', function() {
  return gulp.src('./src/img/*')
    .pipe($.imageResize({
      width: 320,
      height: 320,
      crop: false,
      upscale: false
    }))
    .pipe($.rename(function(path) {
      path.basename += "-320";
    }))
    .pipe(gulp.dest('./dist/img/'));
});

gulp.task('image_resize_512', function() {
  return gulp.src('./src/img/*')
    .pipe($.imageResize({
      width: 512,
      height: 512,
      crop: false,
      upscale: false
    }))
    .pipe($.rename(function(path) {
      path.basename += "-512";
    }))
    .pipe(gulp.dest('./dist/img/'));
});

gulp.task('webp', ['image_resize_480', 'image_resize_768', 'image_resize_1200', 'image_resize_2400', 'image_resize_320', 'image_resize_512'], function() {
  return gulp.src('./dist/img/**')
    .pipe($.webp())
    .pipe(gulp.dest('./dist/img/'));
});

gulp.task('optimize', ['webp'], function() {
  return gulp.src('./dist/img/**')
    .pipe($.imagemin({
      progressive: true,
      svgoPlugins: [{
        removeViewBox: false
      }],
      use: [pngquant()]
    }))
    .pipe(gulp.dest('./dist/img/'));
});

//master image task
gulp.task('img', ['webp']);

//begin deploy sub-tasks

gulp.task('uglify', ['browserify'], function(argument) {
  return gulp.src('./src/js/*.js')
    .pipe($.uglify())
    .pipe(gulp.dest('./dist/js'))
});

gulp.task('minifyCSS', ['uglify'], function() {
  return gulp.src('./dist/css/*.css')
    .pipe($.purifycss(['./js/*.js', 'dist/**/*.html']))
    .pipe($.minifyCss())
    .pipe(gulp.dest('./dist/css/'))
});

gulp.task('uncss', function() {
  return gulp.src('./dist/css/*.css')
    .pipe(uncss({
      html: [
        'dist/index.html',
        'dist/about/index.html',
        'dist/services/index.html',
        'dist/contact/index.html',
      ]
    }))
    .pipe(gulp.dest('./dist/css/'))
});


gulp.task('rev', ['minifyCSS'], function() {
  return gulp.src([
      './dist/**/*',
      '!./dist/**/*.html',
      '!./dist/img/*'
    ])
    .pipe($.rev())
    .pipe(gulp.dest('dist'))
    .pipe($.rev.manifest())
    .pipe(gulp.dest('.'))
});

gulp.task('revReplace', ['rev'], function() {
  var manifest = require('./rev-manifest.json');
  return gulp.src(['./rev-manifest.json', './dist/**/*.html'])
    .pipe($.revCollector({
      replaceReved: true,
    }))
    .on('error', function() {
      console.log(error)
    })
    .pipe(gulp.dest('./dist'))
});

gulp.task('minifyHTML', ['revReplace'], function() {
  var opts = {
    spare: true
  };
  return gulp.src('./src/**/*.html')
    .pipe($.inlineSource())
    .on('error', function(error) {
      console.log(error)
    })
    .pipe($.minifyHtml(opts))
    .on('error', function(error) {
      console.log(error)
    })

    .pipe(gulp.dest('./dist/'))
});

gulp.task('g-zip', ['minifyHTML'], function() {
  return gulp.src(['./dist/**/*'], ['!aws.json'], ['!*.xml'])
    .pipe($.gzip())
    .pipe(gulp.dest('./dist'))
});

gulp.task('awsHTML', function() {
  return gulp.src('./dist/**/*.html.gz')
    .pipe($.s3(aws, {
      gzippedOnly: true,
      headers: {
        'Cache-Control': 'max-age=315360000, no-transform, public',
        'Content-Type': 'text/html; charset=UTF-8',
      }
    }));
})

gulp.task('awsJS', function() {
  return gulp.src('./dist/**/*.js.gz')
    .pipe($.s3(aws, {
      gzippedOnly: true,
      headers: {
        'Cache-Control': 'max-age=315360000, no-transform, public',
        'Content-Type': 'application/javascript; charset=UTF-8',
        'Vary': 'Accept-Encoding'
      }
    }))
    .on('error', function(e) {
      console.log('e', e);
    });
})

gulp.task('awsCSS', function() {
  return gulp.src('./dist/**/*.css.gz')
    .pipe($.s3(aws, {
      gzippedOnly: true,
      headers: {
        'Cache-Control': 'max-age=315360000, no-transform, public',
        'Content-Type': 'text/css; charset=UTF-8',
        'Vary': 'Accept-Encoding'
      }
    }));
});

gulp.task('awsEverythingElse', function() {
  return gulp.src([
      './dist/**/*',
      '!./dist/**/*.css.gz',
      '!./dist/**/*.html.gz',
      '!./dist/**/*.js.gz'
    ])
    .pipe($.s3(aws, {
      gzippedOnly: true,
      headers: {
        'Cache-Control': 'max-age=315360000, no-transform, public',
        'Vary': 'Accept-Encoding'
      }
    }));
});

gulp.task('aws', ['awsHTML', 'awsCSS', 'awsJS', 'awsEverythingElse'], function() {
  return gulp.src('./dist/**')
    .pipe($.cloudfront(aws))
});

gulp.task('deploy', ['g-zip'], function() {
  gulp.start('psi');
});

gulp.task('psi', ['aws'], function(cb) {
  psi({
    nokey: 'true',
    url: 'dalan.kim',
    strategy: 'mobile',
  });
  psi({
    nokey: 'true',
    url: 'dalan.kim',
    strategy: 'desktop',
  }, cb);
});
