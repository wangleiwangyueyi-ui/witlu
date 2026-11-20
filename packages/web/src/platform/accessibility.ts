let refreshModal: (() => void) | undefined;

export function focusNewModal() { refreshModal?.(); }

/** Focus containment for all modal surfaces, including dynamically loaded cards. */
export function installModalFocus(){
  const selector='button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]';
  let active:HTMLElement|null=null,previous:HTMLElement|null=null;
  const visible=(e:HTMLElement)=>!!e.getClientRects().length&&!e.closest('[inert]');
  const refresh=()=>{const modals=[...document.querySelectorAll<HTMLElement>('[aria-modal="true"]')].filter(visible),next=modals.at(-1)??null;if(next===active)return;
    if(!next){active=null;if(previous?.isConnected)previous.focus({preventScroll:true});previous=null;return;}
    if(!active)previous=document.activeElement instanceof HTMLElement?document.activeElement:null;active=next;
    if(!next.contains(document.activeElement)){const nodes=[...next.querySelectorAll<HTMLElement>(selector)].filter(visible);const target=nodes.find(node=>node.hasAttribute('data-modal-autofocus'))??nodes[0];if(target)target.focus({preventScroll:true});else {next.tabIndex=-1;next.focus({preventScroll:true});}}
  };
  refreshModal=refresh;
  new MutationObserver(refresh).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-modal']});
  document.addEventListener('keydown',e=>{if(e.key!=='Tab'||!active)return;const nodes=[...active.querySelectorAll<HTMLElement>(selector)].filter(visible),first=nodes[0],last=nodes.at(-1);if(!first){e.preventDefault();active.focus();return;}
    if(!active.contains(document.activeElement)||(e.shiftKey&&document.activeElement===first)){e.preventDefault();(e.shiftKey?last:first)?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  },true);
  document.addEventListener('focusin',()=>{if(active&&!active.contains(document.activeElement)){const first=[...active.querySelectorAll<HTMLElement>(selector)].find(visible);first?.focus({preventScroll:true});}});refresh();
}
