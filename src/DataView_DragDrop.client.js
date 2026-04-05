window.DataView_DragDrop = (function () {
    let _dragSrcIdx = -1;
    let _onOrderChangeCallback = null;

    /**
     * Initializes the Drag&Drop engine with a callback for when columns reorder.
     * @param {Function} onOrderChange - Callback(srcIdx, targetIdx).
     */
    function init(onOrderChange) {
        _onOrderChangeCallback = onOrderChange;
    }

    function onDragStart(idx, ev) {
        _dragSrcIdx = idx;
        ev.dataTransfer.effectAllowed = 'move';
        ev.dataTransfer.setData('text/plain', String(idx)); // Requerido en Firefox
        requestAnimationFrame(() => {
            const th = document.querySelector(`.dv-table th[data-colidx="${idx}"]`);
            if (th) th.classList.add('dv-th-dragging');
        });
    }

    function onDragOver(targetIdx, ev) {
        if (_dragSrcIdx === -1 || targetIdx === _dragSrcIdx) return;
        ev.preventDefault(); // Habilita target de drop
        ev.dataTransfer.dropEffect = 'move';
        
        document.querySelectorAll('.dv-table th').forEach(th => th.classList.remove('dv-th-drag-over'));
        const th = document.querySelector(`.dv-table th[data-colidx="${targetIdx}"]`);
        if (th) th.classList.add('dv-th-drag-over');
    }

    function onDragLeave(ev) {
        const th = ev.target.closest('th');
        if (th) th.classList.remove('dv-th-drag-over');
    }

    function onDrop(targetIdx, ev) {
        ev.preventDefault();
        if (_dragSrcIdx === -1 || _dragSrcIdx === targetIdx) {
            _dragSrcIdx = -1;
            return;
        }
        
        const srcIdx = _dragSrcIdx;
        _dragSrcIdx = -1;
        
        if (typeof _onOrderChangeCallback === 'function') {
            _onOrderChangeCallback(srcIdx, targetIdx);
        }
    }

    function onDragEnd(ev) {
        _dragSrcIdx = -1;
        document.querySelectorAll('.dv-table th').forEach(th => {
            th.classList.remove('dv-th-dragging');
            th.classList.remove('dv-th-drag-over');
        });
    }

    return {
        init,
        onDragStart,
        onDragOver,
        onDragLeave,
        onDrop,
        onDragEnd
    };
})();