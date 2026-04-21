const fs = require('fs');
let css = fs.readFileSync('src/CSS_DataView.html', 'utf8');

// 1. Remove old appended styles from line 3 onwards if they exist
const styleTagEnd = css.indexOf('</style>');
const styleTagStart = css.indexOf('<style>');

// We are going to completely redefine everything after the minified CSS block.
// The minified CSS is likely one huge line. We can extract it by removing everything we added.
const baseCSSMatch = css.match(/<style>(.*\.dv-pagination\{.*?\})/s);

if (baseCSSMatch) {
    let baseCSS = baseCSSMatch[1].trim();
    
    const premiumCSS = `
/* -- PREMIUM GRID CARDS -- */
.dv-card-grid-modern {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    border: 1px solid var(--dv-border);
    border-radius: var(--dv-radius);
    background: var(--dv-surface);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.dv-card-grid-modern:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.dv-card-top-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
}

.dv-badge-circular {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 1.2rem;
    flex-shrink: 0;
    background: var(--dv-primary-light, rgba(28, 66, 232, 0.1));
    color: var(--dv-primary, #1c42e8);
}

.dv-card-top-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.dv-card-lexical-id {
    font-family: monospace;
    font-size: 0.72rem;
    color: var(--dv-text-secondary);
    background: var(--dv-bg);
    padding: 2px 8px;
    border-radius: 12px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    border: 1px solid var(--dv-border);
}

.dv-kebab-menu {
    background: transparent;
    border: none;
    color: var(--dv-text-secondary);
    font-size: 1.3rem;
    cursor: pointer;
    padding: 4px;
    border-radius: var(--dv-radius-sm);
    transition: background var(--dv-transition), color var(--dv-transition);
    display: flex;
    align-items: center;
    justify-content: center;
}
.dv-kebab-menu:hover {
    background: var(--dv-bg);
    color: var(--dv-text-primary);
}

.dv-card-hero {
    display: flex;
    flex-direction: column;
}

.dv-card-hero-title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--dv-text-primary);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.dv-card-graph-sep {
    border: none;
    border-bottom: 1px solid var(--dv-border);
    margin: 0;
    width: 100%;
    opacity: 0.6;
}

.dv-card-graph-nodes {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.dv-node-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.82rem;
    background: var(--dv-bg);
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid var(--dv-border);
}

.dv-node-pill ion-icon {
    font-size: 1.1rem;
    color: var(--dv-primary);
}

.dv-node-text-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
    flex: 1;
}

.dv-node-label {
    color: var(--dv-text-secondary);
    font-weight: 500;
}

.dv-node-value {
    color: var(--dv-text-primary);
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.dv-node-empty {
    opacity: 0.6;
    background: transparent;
    border: 1px dashed var(--dv-border);
}
.dv-node-empty ion-icon {
    color: var(--dv-text-light);
}
`;

    const newContent = `<style>\n${baseCSS}\n${premiumCSS}\n</style>`;
    fs.writeFileSync('src/CSS_DataView.html', newContent, 'utf8');
    console.log("CSS Premium aplicado con éxito a CSS_DataView.html");

} else {
    console.log("Error: No se pudo aislar el CSS base");
}
