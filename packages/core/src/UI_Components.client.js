function initializeSmartSelects() {
      const selects = document.querySelectorAll('.smart-select');
      const isDesktop = window.innerWidth >= 768;
      selects.forEach(select => {
        select.interface = isDesktop ? 'popover' : 'action-sheet';
      });
    }