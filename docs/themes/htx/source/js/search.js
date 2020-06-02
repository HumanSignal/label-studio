// A local search script with the help of [hexo-generator-search](https://github.com/PaicHyperionDev/hexo-generator-search)
// Copyright (C) 2015
// Joseph Pan <http://github.com/wzpan>
// Shuhao Mao <http://github.com/maoshuhao>
// This library is free software; you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as
// published by the Free Software Foundation; either version 2.1 of the
// License, or (at your option) any later version.
//
// This library is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA
// 02110-1301 USA
//

var searchFunc = function (path, search_id, content_id) {
  'use strict';
  $.ajax({
    url: path,
    dataType: "xml",
    success: function (xmlResponse) {
      // get the contents from search data
      var datas = $("entry", xmlResponse).map(function () {
        return {
          title: $("title", this).text(),
          content: $("content", this).text(),
          url: $("url", this).text()
        };
      }).get();

      var $input = document.getElementById(search_id);

      if (!$input) return;
      var $resultContent = document.getElementById(content_id);
      if ($("#" + search_id).length > 0) {
        $input.addEventListener('input', function () {
          var str = '<div id="local-search-result"><h3>Search results</h3><ul class=\"search-result-list\">';
          let search_value = this.value;
          var keywords = search_value.trim().toLowerCase().split(/[\s\-]+/);
          $resultContent.innerHTML = "";
          if (this.value.trim().length <= 0) {
            return;
          }
          let found = false;
          // perform local searching
          datas.forEach(function (data) {
            var isMatch = true;
            var content_index = [];
            if (!data.title || data.title.trim() === '') {
              data.title = "Untitled";
            }
            var data_title = data.title.trim().toLowerCase();
            var data_content = data.content.trim().replace(/<[^>]+>/g, "").toLowerCase();
            var data_url = data.url;
            var index_title = -1;
            var index_content = -1;
            var first_occur = -1;
            // only match artiles with not empty contents
            if (data_content !== '') {
              keywords.forEach(function (keyword, i) {
                index_title = data_title.indexOf(keyword);
                index_content = data_content.indexOf(keyword);

                if (index_title < 0 && index_content < 0) {
                  isMatch = false;
                } else {
                  if (index_content < 0) {
                    index_content = 0;
                  }
                  if (i === 0) {
                    first_occur = index_content;
                  }
                  // content_index.push({index_content:index_content, keyword_len:keyword_len});
                }
              });
            } else {
              isMatch = false;
            }
            // show search results
            if (isMatch) {
              found = true;

              str += "<li onclick='window.location=\"" + data_url + "\"'>" +
                     "<a href='" + data_url + "?from_search=" + search_value +
                     "' class='search-result-title'>" + data_title + "</a>";
              var content = data.content.trim().replace(/<[^>]+>/g, " ");
              if (first_occur >= 0) {
                // cut out 100 characters
                var start = first_occur - 20;
                var end = first_occur + 80;

                if (start < 0) {
                  start = 0;
                }

                if (start === 0) {
                  end = 100;
                }

                if (end > content.length) {
                  end = content.length;
                }

                var match_content = content.substring(start, end);

                // highlight all keywords
                keywords.forEach(function (keyword) {
                  var regS = new RegExp(keyword, "gi");
                  match_content = match_content.replace(regS, "<em class=\"search-keyword\">" + keyword + "</em>");
                });

                str += "<p class=\"search-result\">" + match_content + "...</p>"
              }
              str += "</li>";
            }
          });

          if (!found) {
            str += '<li>Nothing found</li>';
          }
          str += "</ul></div>";
          $resultContent.innerHTML = str;
          $("#" + search_id).css({left: $(window).width() - $("#" + search_id).outerWidth()});
        });
      }
    }
  });
};

var moveSearchState = 1;

// move search input depending on window width
function moveSearch() {
  if ($(window).width() > 600 && $('#nav').is(':visible')) {
      if (moveSearchState === 2) {
          var element = $('#site_search').detach();
          $('#nav').append(element);
          element.css({'position': 'relative', 'top': 0, 'margin-right': '1em'});
          moveSearchState = 1;
      }
  } else {
      if (moveSearchState === 1){
        var element = $('#site_search').detach();
        $('body').append(element);
        element.css({'position': 'fixed', 'top': '25px', 'margin-right': '1.75em'});
        moveSearchState = 2;
    }
  }
}

$(function () {
  // close search results on outside of results click
  $('#local-search-result-wrapper').click(function () {
    event.stopPropagation()
  });
  $('body').click(function () {
    if ($(event.target).attr('id') !== 'local-search-input') {
      $('#local-search-result-wrapper').html('');
    }
  });

  moveSearch();
  $(window).resize(moveSearch);
});


