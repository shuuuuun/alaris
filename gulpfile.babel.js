'use strict';

// const
const PORT = null;
const FALLBACK = '404.html';

const HTTP_PATH = './public/';
const DEST_PATH = './public/';
const SRC_PATH = './_src/';
const CONFIG_PATH = './config/';
const DEST_HTML = DEST_PATH;
const DEST_CSS = `${DEST_PATH}css/`;
const DEST_JS = `${DEST_PATH}js/`;
const SRC_PUG = `${SRC_PATH}pug/`;
const SRC_SASS = `${SRC_PATH}sass/`;
const SRC_JS = `${SRC_PATH}js/`;
const GLOB_UNBUILD = '!' + `${SRC_PATH}**/_**`;
const GLOB_PUG = `${SRC_PUG}**/*.pug`;
const GLOB_SASS = `${SRC_SASS}**/*.sass`;
const GLOB_SCSS = `${SRC_SASS}**/*.scss`;
const GLOB_JS = `${SRC_JS}**/*.js`;
const GLOB_CONFIG = `${CONFIG_PATH}**/*`;

const CONFIG_PATHS = {
  site: `${CONFIG_PATH}site.yml`,
  jsCopy: `${CONFIG_PATH}js-copy.json`,
  browserify: `${CONFIG_PATH}browserify.json`,
  pleeease: `${CONFIG_PATH}pleeease.json`,
  eslintrc: `${CONFIG_PATH}eslintrc.json`,
};


// import
import gulp from 'gulp';
import plumber from 'gulp-plumber';
import sass from 'gulp-sass';
import pleeease from 'gulp-pleeease';
import pug from 'gulp-pug';
import watch from 'gulp-watch';
import uglify from 'gulp-uglify';
import gutil from 'gulp-util';
import rename from 'gulp-rename';
import browserify from 'browserify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import babelify from 'babelify';
import gulpif from 'gulp-if';
import gulpIgnore from 'gulp-ignore';
import notify from 'gulp-notify';
import eslint from 'gulp-eslint';
import Koko from 'koko';
import readConfig from 'read-config';


// tasks
gulp.task('default',['build', 'server', 'watch']);
gulp.task('build', ['html', 'css', 'js']);
gulp.task('html', ['pug']);
gulp.task('css', ['sass']);
gulp.task('js', ['lint', 'browserify', 'js-copy']);

gulp.task('watch', () => {
  watch(GLOB_PUG, () => {
    gulp.start('pug');
  });
  watch(GLOB_JS, () => {
    gulp.start('js');
  });
  watch([GLOB_SASS, GLOB_SCSS], () => {
    gulp.start('sass');
  });
  watch(GLOB_CONFIG, () => {
    gulp.start('build');
  });
});

gulp.task('server', () => {
  // TODO: DEST_PATHが存在しないとエラーになる問題
  // TODO: FALLBACK設定
  new Koko(DEST_PATH, {
    openPath: (gutil.env.open ? '/' : null),
    staticPort: (gutil.env.port || PORT || null),
  }).start();
});

gulp.task('pug', () => {
  const config = readConfig(CONFIG_PATHS.site);
  gulp.src([GLOB_PUG, GLOB_UNBUILD])
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(pug({
      locals: config,
      pretty: true
    }))
    .pipe(rename((path) => {
      // ex. hoge.pug -> hoge.html
      // ex. hoge__.pug -> hoge/index.html
      // ex. hoge__fuga.pug -> hoge/fuga.html
      // ex. hoge__fuga__.pug -> hoge/fuga/index.html
      if (!!path.basename.match(/__$/)) {
        path.dirname += '/' + path.basename.replace(/__/g, '/');
        path.basename = 'index';
      }
      else {
        let ary = path.basename.split('__');
        let base = ary.pop();
        let dir = ary.join('/');
        path.dirname += '/' + dir;
        path.basename = base;
      }
    }))
    .pipe(gulp.dest(DEST_HTML));
});

gulp.task('sass', () => {
  const config = readConfig(CONFIG_PATHS.pleeease);
  gulp.src([GLOB_SASS, GLOB_SCSS, GLOB_UNBUILD])
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(sass())
    .pipe(pleeease(config))
    .pipe(gulp.dest(DEST_CSS))
    .pipe(notify('sass build succeeded!!'));
});

gulp.task('js-copy', () => {
  const config = readConfig(CONFIG_PATHS.jsCopy);
  gulp.src(config.files)
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(gulpif(!gutil.env.develop, uglify({ preserveComments: 'some' }))) // developモードではminifyしない
    .pipe(gulp.dest(DEST_JS));
});

gulp.task('browserify', () => {
  const config = readConfig(CONFIG_PATHS.browserify);
  browserify({
    entries: config.entries,
    paths: config.paths,
  })
  .transform(babelify)
  .bundle()
  .on('error', notify.onError('<%= error.message %>'))
  .pipe(source(config.dest))
  .pipe(buffer())
  .pipe(gulpif(!gutil.env.develop, uglify({ preserveComments: 'some' }))) // developモードではminifyしない
  .pipe(gulp.dest(DEST_JS));
});

gulp.task('lint', () => {
  const config = readConfig(CONFIG_PATHS.eslintrc);
  gulp.src([GLOB_JS, GLOB_UNBUILD])
    .pipe(plumber({ errorHandler: notify.onError('<%= error.message %>') }))
    .pipe(eslint(config))
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});
