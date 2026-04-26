(function () {
  if (window.__lbThemeInitialized) return;
  window.__lbThemeInitialized = true;

  function moneyFormat(cents, drawer) {
    var value = (Number(cents || 0) / 100).toFixed(2);
    var locale = document.documentElement.lang || 'en-PK';
    var currency = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'PKR';

    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: currency, maximumFractionDigits: 2 }).format(Number(value));
    } catch (err) {
      return 'PKR ' + value;
    }
  }

  function updateCartCount(count) {
    document.querySelectorAll('[data-lb-cart-count]').forEach(function (node) {
      node.textContent = count;
    });
  }

  function buildCartItem(item, drawer) {
    var image = item.image ? '<img src="' + item.image + '&width=220" alt="' + (item.product_title || '') + '" loading="lazy" />' : '';
    return (
      '<li class="lb-cart-item">' +
      '<a class="lb-cart-item__image" href="' + item.url + '">' + image + '</a>' +
      '<div class="lb-cart-item__meta">' +
      '<a href="' + item.url + '" class="lb-cart-item__title">' + item.product_title + '</a>' +
      '<p class="lb-cart-item__variant">' + (item.variant_title || '') + '</p>' +
      '<p class="lb-cart-item__price">' + moneyFormat(item.final_line_price, drawer) + '</p>' +
      '<div class="lb-cart-item__qty">' +
      '<button type="button" data-lb-cart-qty="dec" data-key="' + item.key + '">-</button>' +
      '<span>' + item.quantity + '</span>' +
      '<button type="button" data-lb-cart-qty="inc" data-key="' + item.key + '">+</button>' +
      '<button type="button" data-lb-cart-qty="remove" data-key="' + item.key + '">Remove</button>' +
      '</div></div></li>'
    );
  }

  function renderCart(cart, drawer) {
    if (!drawer) return;

    var itemsNode = drawer.querySelector('[data-lb-cart-items]');
    var emptyNode = drawer.querySelector('[data-lb-cart-empty]');
    var subtotalNode = drawer.querySelector('[data-lb-cart-subtotal]');

    updateCartCount(cart.item_count || 0);

    if (subtotalNode) {
      subtotalNode.textContent = moneyFormat(cart.total_price || 0, drawer);
    }

    if (!itemsNode || !emptyNode) return;

    if (!cart.items || cart.items.length === 0) {
      itemsNode.innerHTML = '';
      emptyNode.hidden = false;
      return;
    }

    emptyNode.hidden = true;
    itemsNode.innerHTML = cart.items.map(function (item) {
      return buildCartItem(item, drawer);
    }).join('');
  }

  function fetchCart() {
    return fetch('/cart.js', { headers: { Accept: 'application/json' } }).then(function (response) {
      return response.json();
    });
  }

  function changeCartQuantity(key, quantity) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ id: key, quantity: quantity })
    }).then(function (response) {
      return response.json();
    });
  }

  function addToCart(form) {
    var formData = new FormData(form);
    return fetch('/cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData
    }).then(function (response) {
      if (!response.ok) {
        return response.json().then(function (data) {
          throw new Error(data.description || 'Unable to add product to cart');
        });
      }
      return response.json();
    });
  }

  var mobileToggle = document.querySelector('[data-lb-mobile-toggle]');
  var mobileDrawer = document.querySelector('[data-lb-mobile-drawer]');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', function () {
      var expanded = mobileToggle.getAttribute('aria-expanded') === 'true';
      mobileToggle.setAttribute('aria-expanded', String(!expanded));
      mobileDrawer.classList.toggle('is-open');
    });
  }

  var quickViewModal = document.querySelector('[data-lb-quick-modal]');
  var cartDrawer = document.querySelector('[data-lb-cart-drawer]');

  function openCartDrawer() {
    if (!cartDrawer) return;
    cartDrawer.classList.add('is-open');
    cartDrawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCartDrawer() {
    if (!cartDrawer) return;
    cartDrawer.classList.remove('is-open');
    cartDrawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (cartDrawer) {
    fetchCart().then(function (cart) {
      renderCart(cart, cartDrawer);
    }).catch(function () {});
  }

  document.addEventListener('click', function (event) {
    var quickTrigger = event.target.closest('[data-lb-quick-view]');
    if (quickTrigger && quickViewModal) {
      event.preventDefault();
      var modalTitle = quickViewModal.querySelector('[data-lb-qv-title]');
      var modalPrice = quickViewModal.querySelector('[data-lb-qv-price]');
      var modalImage = quickViewModal.querySelector('[data-lb-qv-image]');
      var modalLink = quickViewModal.querySelector('[data-lb-qv-link]');

      if (modalTitle) modalTitle.textContent = quickTrigger.getAttribute('data-product-title') || '';
      if (modalPrice) modalPrice.textContent = quickTrigger.getAttribute('data-product-price') || '';
      if (modalImage) {
        modalImage.src = quickTrigger.getAttribute('data-product-image') || '';
        modalImage.alt = quickTrigger.getAttribute('data-product-title') || '';
      }
      if (modalLink) modalLink.href = quickTrigger.getAttribute('data-product-url') || '#';

      quickViewModal.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      return;
    }

    if (event.target.closest('[data-lb-modal-close]') || event.target.matches('[data-lb-modal-overlay]')) {
      if (quickViewModal) quickViewModal.classList.remove('is-open');
      if (!cartDrawer || !cartDrawer.classList.contains('is-open')) {
        document.body.style.overflow = '';
      }
    }

    if (event.target.closest('[data-lb-cart-toggle]')) {
      event.preventDefault();
      if (cartDrawer) {
        fetchCart().then(function (cart) {
          renderCart(cart, cartDrawer);
          openCartDrawer();
        });
      }
      return;
    }

    if (event.target.closest('[data-lb-cart-close]')) {
      event.preventDefault();
      closeCartDrawer();
      return;
    }

    var qtyButton = event.target.closest('[data-lb-cart-qty]');
    if (qtyButton && cartDrawer) {
      event.preventDefault();
      var action = qtyButton.getAttribute('data-lb-cart-qty');
      var key = qtyButton.getAttribute('data-key');

      fetchCart()
        .then(function (cart) {
          var item = (cart.items || []).find(function (it) {
            return it.key === key;
          });
          if (!item) return cart;

          var nextQty = item.quantity;
          if (action === 'inc') nextQty = item.quantity + 1;
          if (action === 'dec') nextQty = Math.max(0, item.quantity - 1);
          if (action === 'remove') nextQty = 0;

          return changeCartQuantity(key, nextQty);
        })
        .then(function (cart) {
          renderCart(cart, cartDrawer);
        })
        .catch(function () {});
      return;
    }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target.closest('[data-lb-product-form]');
    if (!form || !cartDrawer) return;

    event.preventDefault();

    addToCart(form)
      .then(function () {
        return fetchCart();
      })
      .then(function (cart) {
        renderCart(cart, cartDrawer);
        openCartDrawer();
      })
      .catch(function (error) {
        alert(error.message || 'Could not add to cart');
      });
  });

  var stickyAtc = document.querySelector('[data-lb-sticky-atc]');
  var addToCartBtn = document.querySelector('[data-lb-main-atc]');

  if (stickyAtc && addToCartBtn) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            stickyAtc.classList.remove('is-visible');
          } else {
            stickyAtc.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(addToCartBtn);

    var stickyBtn = stickyAtc.querySelector('[data-lb-sticky-submit]');
    if (stickyBtn) {
      stickyBtn.addEventListener('click', function () {
        var form = document.querySelector('[data-lb-product-form]');
        if (!form) return;
        form.requestSubmit ? form.requestSubmit() : form.submit();
      });
    }
  }
})();
