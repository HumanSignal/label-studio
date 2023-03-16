hexo.extend.generator.register('page', function(locals){
  const { config } = this;

  /* If you’re on the OSS site, remove every pages with `enterprise` tier. Opposite for the ENT site */
  const tierToRemove = config.theme_config.tier === "opensource" ? "enterprise" : "opensource";

  const pagesToBuild = locals.pages.filter(page => page.tier !== tierToRemove);
  return pagesToBuild.map(function(page){
    return {
      path: page.path,
      data: page,
      layout: page.layout || 'page'
    };
  });
});