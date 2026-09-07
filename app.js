const SUPABASE_URL='https://kzokretuuigjhxjzdlmk.supabase.co';
const KEY='sb_publishable_m8gAAZTKnOvCSWNvQijIXw_H1obE9vg';
const H={apikey:KEY,Authorization:`Bearer ${KEY}`};
const $=s=>document.querySelector(s);
let data={branches:[],categories:[],products:[],branchProducts:[],branchSettings:[],variants:[],modifiers:[],productModifiers:[],paymentMethods:[],branchPaymentMethods:[],websiteSettings:{id:1,theme_name:'topburger',page_background:'#b51f2b',surface_color:'#ffffff',text_color:'#171717',card_radius:22,show_contact:true,show_locations:true,show_track_order:true,show_cancel_order:true,allow_customer_cancel:true,show_payment_reference:true,show_payment_receipt_upload:true,show_payment_status:true},business:{business_name:'Top Burger',tagline:'🔥 طعم يستاهل التجربة',logo_url:'',currency_symbol:'ج.م',primary_color:'#b51f2b',accent_color:'#f0643d'},branch:null,cat:null,q:'',cart:[],selected:null,selectedVariant:null,selectedExtras:new Set(),selectedPayment:null};

async function get(path){const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{headers:H});if(!r.ok)throw new Error(await r.text());return r.json()}
async function rpc(name,body){const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{...H,'Content-Type':'application/json'},body:JSON.stringify(body)});let d=null;try{d=await r.json()}catch{}if(!r.ok)throw new Error(d?.message||'تعذر إرسال الطلب');return d}
const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function money(n){return `${Number(n||0).toFixed(0)} ${data.business?.currency_symbol||'ج.م'}`}
function applyWebsiteTheme(){const w=data.websiteSettings||{};const root=document.documentElement;root.style.setProperty('--site-bg',w.page_background||'#b51f2b');root.style.setProperty('--site-surface',w.surface_color||'#fff');root.style.setProperty('--site-text',w.text_color||'#171717');root.style.setProperty('--site-radius',`${Number(w.card_radius||22)}px`);document.querySelector('meta[name="theme-color"]')?.setAttribute('content',w.page_background||data.business?.primary_color||'#b51f2b')}
function branchPaymentRows(branchId=data.branch){return data.branchPaymentMethods.filter(x=>String(x.branch_id)===String(branchId)&&x.active!==false&&x.website_enabled===true).map(r=>{const m=data.paymentMethods.find(x=>String(x.id)===String(r.payment_method_id));return m?{...m,...r,method_id:m.id,code:m.code,name:m.name}:null}).filter(Boolean).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)||Number(a.id)-Number(b.id))}
function paymentStatusText(v){return ({unpaid:'غير مدفوع',proof_submitted:'تم رفع إثبات الدفع — بانتظار المراجعة',confirmed:'تم تأكيد الدفع',rejected:'إثبات الدفع مرفوض'}[v]||'غير مدفوع')}
function orderStatusText(v){return ({pending:'تم إرسال الطلب للفرع',accepted:'تم استلام الطلب',new:'تم استلام الطلب',preparing:'جاري التجهيز',ready:'الطلب جاهز',out_for_delivery:'خرج للتوصيل',delivered:'تم التسليم',completed:'مكتمل',rejected:'ملغي / مرفوض',cancelled:'ملغي'}[v]||v||'')}

function applyBusinessBranding(){
  const b=data.business||{};document.title=`${b.business_name||'Top Burger'} | اطلب أونلاين`;
  const root=document.documentElement;if(b.primary_color)root.style.setProperty('--brand-primary',b.primary_color);if(b.accent_color)root.style.setProperty('--brand-accent',b.accent_color);
  document.querySelectorAll('[data-business-name]').forEach(x=>x.textContent=b.business_name||'Top Burger');
  document.querySelectorAll('[data-business-tagline]').forEach(x=>x.textContent=b.tagline||'');
  document.querySelectorAll('[data-business-logo]').forEach(x=>{if(b.logo_url){x.src=b.logo_url;x.classList.remove('hidden')}else{x.classList.add('hidden')}});
  document.querySelectorAll('[data-business-logo-fallback]').forEach(x=>x.classList.toggle('hidden',!!b.logo_url));applyWebsiteTheme();
}
function branchRow(p){return data.branchProducts.find(x=>String(x.branch_id)===String(data.branch)&&String(x.product_id)===String(p.id))}
function priceFor(p){const o=branchRow(p);return Number(o?.price_override??p.price??0)}
function available(p){const o=branchRow(p);if(!o)return true;if(o.active===false)return false;const u=o.website_paused_until?new Date(o.website_paused_until):null;return !(u&&!Number.isNaN(u.getTime())&&u.getTime()>Date.now())}
function branchSetting(id=data.branch){return data.branchSettings.find(x=>String(x.branch_id)===String(id))||{branch_id:id,orders_open:true,orders_paused_until:null,prep_min:30,prep_max:45}}
function branchOpen(id=data.branch){const r=branchSetting(id);if(r.orders_open===false)return false;const u=r.orders_paused_until?new Date(r.orders_paused_until):null;return !(u&&!Number.isNaN(u.getTime())&&u.getTime()>Date.now())}
function prepText(id=data.branch){const r=branchSetting(id),a=Number(r.prep_min||30),b=Number(r.prep_max||45);return a===b?`${a} دقيقة`:`${a}–${b} دقيقة`}
function branchStatusText(id){const r=branchSetting(id);if(r.orders_open===false)return '🔴 الطلبات متوقفة مؤقتًا';const u=r.orders_paused_until?new Date(r.orders_paused_until):null;if(u&&!Number.isNaN(u.getTime())&&u.getTime()>Date.now())return `🟠 متوقف حتى ${u.toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}`;return `🟢 مفتوح • التجهيز ${prepText(id)}`}
function productVariants(p){return data.variants.filter(v=>String(v.product_id)===String(p.id)&&v.active!==false).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||Number(a.id)-Number(b.id))}
function productExtras(p){if(p.allow_extras===false)return[];const allowed=new Set(data.productModifiers.filter(x=>String(x.product_id)===String(p.id)).map(x=>String(x.modifier_id)));return data.modifiers.filter(m=>m.active!==false&&allowed.has(String(m.id))).sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||Number(a.id)-Number(b.id))}
function productDisplayPrice(p){const vs=productVariants(p);if(!vs.length)return money(priceFor(p));const vals=vs.map(v=>Number(v.price||0));return vals.length===1?money(vals[0]):`من ${money(Math.min(...vals))}`}

async function load(){
  try{
    const [b,c,p,bp,bs,biz,v,m,pm,ws,pay,bpay]=await Promise.all([
      get('branches?select=id,name,phone,address,location_url,whatsapp&active=eq.true&website_visible=eq.true&order=sort_order.asc,id.asc'),
      get('categories?select=id,name,active,website_visible,website_sort_order,sort_order&active=eq.true&website_visible=eq.true&order=website_sort_order.asc,sort_order.asc,id.asc'),
      get('products?select=id,category_id,name,price,image_url,active,website_visible,website_sort_order,allow_extras,allow_removals,allow_item_notes,removable_components&active=eq.true&website_visible=eq.true&order=website_sort_order.asc,id.asc'),
      get('branch_products?select=branch_id,product_id,active,price_override,website_paused_until'),
      get('branch_website_settings?select=branch_id,orders_open,orders_paused_until,prep_min,prep_max').catch(()=>[]),
      get('business_settings?select=*&id=eq.1&limit=1').catch(()=>[]),
      get('product_variants?select=id,product_id,name,price,sort_order,active&active=eq.true&order=sort_order.asc,id.asc'),
      get('modifiers?select=id,name,price,active&active=eq.true&order=id.asc'),
      get('product_modifiers?select=product_id,modifier_id'),
      get('website_settings?select=*&id=eq.1&limit=1').catch(()=>[]),
      get('payment_methods?select=id,code,name,kind,active,sort_order&active=eq.true&order=sort_order.asc,id.asc').catch(()=>[]),
      get('branch_payment_methods?select=branch_id,payment_method_id,active,is_default,website_enabled,payment_account,payment_instructions,allow_reference,allow_receipt_upload&website_enabled=eq.true&active=eq.true').catch(()=>[])
    ]);
    data.branches=b;data.categories=c;data.products=p;data.branchProducts=bp;data.branchSettings=bs;if(biz?.[0])data.business={...data.business,...biz[0]};if(ws?.[0])data.websiteSettings={...data.websiteSettings,...ws[0]};data.paymentMethods=pay||[];data.branchPaymentMethods=bpay||[];data.variants=v;data.modifiers=m;data.productModifiers=pm;applyBusinessBranding();data.branch=null;renderBranchGate();renderDrawer();
  }catch(e){console.error(e);$('#categoryCards').innerHTML='<div class="empty">تعذر تحميل المنيو. شغّل SQL الخاص بـ Website V3 مرة واحدة.</div>'}
}

function openDrawer(){renderDrawer();$('#siteDrawer')?.classList.remove('hidden');document.body.classList.add('drawer-open')}
function closeDrawer(){$('#siteDrawer')?.classList.add('hidden');document.body.classList.remove('drawer-open')}
function renderDrawer(){
  const box=$('#drawerItems'); if(!box)return;
  const w=data.websiteSettings||{};
  const br=data.branches.find(x=>String(x.id)===String(data.branch))||null;
  const items=[];
  if(w.show_contact!==false){
    if(br?.phone) items.push(`<a class="drawer-link" href="tel:${esc(br.phone)}"><span>☎️</span><div><b>اتصل بنا</b><small>${esc(br.phone)}</small></div></a>`);
    else items.push(`<button class="drawer-link" data-drawer-contact><span>☎️</span><div><b>اتصل بنا</b><small>بيانات الفروع</small></div></button>`);
  }
  if(w.show_locations!==false) items.push(`<button class="drawer-link" data-drawer-locations><span>📍</span><div><b>الفروع والعناوين</b><small>العنوان واللوكيشن</small></div></button>`);
  if(w.show_track_order!==false) items.push(`<button class="drawer-link" data-drawer-track><span>🔎</span><div><b>متابعة الطلب</b><small>اعرف حالة طلبك</small></div></button>`);
  if(w.show_cancel_order!==false && w.allow_customer_cancel!==false) items.push(`<button class="drawer-link" data-drawer-track><span>❌</span><div><b>إلغاء الطلب</b><small>متاح قبل استلام الفرع للطلب</small></div></button>`);
  if(w.show_whatsapp && w.whatsapp_url) items.push(`<a class="drawer-link" target="_blank" rel="noopener" href="${esc(w.whatsapp_url)}"><span>💬</span><div><b>واتساب</b></div></a>`);
  if(w.show_facebook && w.facebook_url) items.push(`<a class="drawer-link" target="_blank" rel="noopener" href="${esc(w.facebook_url)}"><span>📘</span><div><b>Facebook</b></div></a>`);
  if(w.show_instagram && w.instagram_url) items.push(`<a class="drawer-link" target="_blank" rel="noopener" href="${esc(w.instagram_url)}"><span>📸</span><div><b>Instagram</b></div></a>`);
  box.innerHTML=items.join('')||'<div class="drawer-empty">لا توجد عناصر مفعلة حاليًا</div>';
}
function showLocations(){
  const lines=data.branches.map(b=>`<div class="location-card"><b>📍 فرع ${esc(b.name)}</b>${b.address?`<p>${esc(b.address)}</p>`:''}<div class="location-actions">${b.phone?`<a href="tel:${esc(b.phone)}">☎ اتصال</a>`:''}${b.location_url?`<a target="_blank" rel="noopener" href="${esc(b.location_url)}">🗺 فتح اللوكيشن</a>`:''}</div></div>`).join('');
  $('#infoModalTitle').textContent='الفروع والعناوين';$('#infoModalBody').innerHTML=lines||'<div class="empty">لا توجد بيانات فروع</div>';$('#infoModal').classList.remove('hidden');
}
function renderWebsitePayments(){
  const rows=branchPaymentRows(); const box=$('#websitePaymentMethods'); if(!box)return;
  if(!rows.length){data.selectedPayment=null;box.innerHTML='<div class="empty small-empty">لا توجد طرق دفع متاحة حاليًا</div>';return;}
  let selected=rows.find(x=>String(x.code)===String(data.selectedPayment))||rows.find(x=>x.is_default)||rows[0]; data.selectedPayment=selected.code;
  box.innerHTML=rows.map(x=>`<button type="button" class="payment-choice ${x.code===selected.code?'active':''}" data-pay-code="${esc(x.code)}"><b>${esc(x.name)}</b>${x.payment_account?`<small>${esc(x.payment_account)}</small>`:''}</button>`).join('');
  renderPaymentDetails();
}
function renderPaymentDetails(){
  const x=branchPaymentRows().find(x=>String(x.code)===String(data.selectedPayment));
  const inst=$('#paymentInstructions'),rf=$('#paymentReferenceField'),uf=$('#paymentReceiptField');
  if(!x){inst?.classList.add('hidden');rf?.classList.add('hidden');uf?.classList.add('hidden');return;}
  const txt=[x.payment_account?`الحساب/الرقم: ${x.payment_account}`:'',x.payment_instructions||''].filter(Boolean).join('\n');
  if(inst){inst.textContent=txt;inst.classList.toggle('hidden',!txt)}
  if(rf)rf.classList.toggle('hidden',!(data.websiteSettings.show_payment_reference!==false && x.allow_reference!==false && x.code!=='cash'));
  if(uf)uf.classList.toggle('hidden',!(data.websiteSettings.show_payment_receipt_upload!==false && x.allow_receipt_upload!==false && x.code!=='cash'));
}
async function uploadPaymentReceipt(file){
  if(!file)return null;
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
  const path=`receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext||'jpg'}`;
  const r=await fetch(`${SUPABASE_URL}/storage/v1/object/website-payment-receipts/${path}`,{method:'POST',headers:{...H,'Content-Type':file.type||'image/jpeg','x-upsert':'false'},body:file});
  if(!r.ok)throw new Error('تعذر رفع صورة الإيصال'); return path;
}
function parseWebOrderId(v){const m=String(v||'').match(/(\d+)/);return m?Number(m[1]):0}
async function trackOrder(){
  const id=parseWebOrderId($('#trackOrderId').value),phone=$('#trackPhone').value.trim(),out=$('#trackResult');
  if(!id||phone.replace(/\D/g,'').length<8)return alert('اكتب رقم الطلب ورقم الموبايل');
  out.innerHTML='جاري التحميل...';
  try{const r=await rpc('track_website_order',{p_website_order_id:id,p_phone:phone});
    out.innerHTML=`<div class="track-card"><b>WEB-${String(id).padStart(5,'0')}</b><p>حالة الطلب: <strong>${esc(orderStatusText(r.status))}</strong></p>${data.websiteSettings.show_payment_status!==false?`<p>حالة الدفع: <strong>${esc(paymentStatusText(r.payment_status))}</strong></p>`:''}${r.status==='pending'&&data.websiteSettings.show_cancel_order!==false&&data.websiteSettings.allow_customer_cancel!==false?`<button class="cancel-order-btn" data-cancel-order="${id}">إلغاء الطلب</button>`:''}</div>`;
  }catch(e){out.innerHTML=`<div class="track-error">${esc(e.message||'تعذر متابعة الطلب')}</div>`}
}
async function cancelCustomerOrder(id){
  const phone=$('#trackPhone').value.trim();if(!confirm('تأكيد إلغاء الطلب؟'))return;
  try{await rpc('cancel_website_order_customer',{p_website_order_id:Number(id),p_phone:phone});alert('تم إلغاء الطلب');await trackOrder()}catch(e){alert(e.message||'تعذر إلغاء الطلب')}
}

function renderAll(){renderBranch();renderCategories();renderCart();renderDrawer()}
function renderBranchGate(){
  const box=$('#branchGateOptions');
  if(!data.branches.length){box.innerHTML='<div class="empty">لا توجد فروع متاحة حاليًا</div>';return;}
  box.innerHTML=data.branches.map(x=>{const open=branchOpen(x.id),contact=[x.address,x.phone].filter(Boolean).join(' • ');return `<button class="branch-choice ${open?'':'closed'}" data-choose-branch="${x.id}" ${open?'':'disabled'}><span class="branch-pin">📍</span><b>فرع ${esc(x.name)}</b><small>${esc(branchStatusText(x.id))}</small>${contact?`<small class="branch-contact-small">${esc(contact)}</small>`:''}</button>`}).join('');
}
function chooseBranch(id){
  const b=data.branches.find(x=>String(x.id)===String(id));if(!b)return;if(!branchOpen(b.id))return alert('الفرع لا يستقبل طلبات الموقع حاليًا');
  data.branch=b.id;data.cat=null;data.q='';data.cart=[];
  $('#search').value='';$('#productsView').classList.add('hidden');$('#categoryView').classList.remove('hidden');
  renderAll();$('#branchGate').classList.add('hidden');renderWebsitePayments();
}
function changeBranch(id){
  if(String(id)===String(data.branch))return;
  if(data.cart.length&&!confirm('تغيير الفرع هيفضي السلة لأن الأسعار والتوافر ممكن يختلفوا بين الفروع. متابعة؟')){renderBranch();return;}
  chooseBranch(id);
}
function renderBranch(){$('#branch').innerHTML=data.branches.map(x=>`<option value="${x.id}" ${String(x.id)===String(data.branch)?'selected':''} ${branchOpen(x.id)?'':'disabled'}>${esc(x.name)}${branchOpen(x.id)?'':' — مغلق'}</option>`).join('');const br=data.branches.find(x=>String(x.id)===String(data.branch));const info=$('#branchInfo');if(info)info.textContent=branchStatusText(data.branch);const contact=$('#branchContact');if(contact)contact.innerHTML=br?[br.address?`<span>📍 ${esc(br.address)}</span>`:'',br.phone?`<a href="tel:${esc(br.phone)}">☎ ${esc(br.phone)}</a>`:''].filter(Boolean).join(''):'';const note=$('#deliveryNote');if(note)note.textContent=`مدة التجهيز المتوقعة: ${prepText(data.branch)}. رسوم التوصيل يؤكدها الفرع عند مراجعة الطلب.`}
function catProducts(c){return data.products.filter(p=>String(p.category_id)===String(c.id)&&available(p))}
function renderCategories(){$('#categoryCards').innerHTML=data.categories.map(c=>{const ps=catProducts(c),img=ps.find(p=>p.image_url)?.image_url;return `<button class="category-card" data-open-cat="${c.id}">${img?`<img src="${esc(img)}" loading="lazy">`:'<div class="fallback">🍔</div>'}<div class="category-info"><b>${esc(c.name)}</b><small>${ps.length} عناصر</small></div></button>`}).join('')||'<div class="empty">لا توجد تصنيفات متاحة</div>'}
function openCategory(id){data.cat=String(id);$('#categoryView').classList.add('hidden');$('#productsView').classList.remove('hidden');renderProducts();scrollTo({top:0,behavior:'smooth'})}
function renderProducts(){
  const c=data.categories.find(x=>String(x.id)===String(data.cat));$('#categoryTitle').textContent=c?.name||'المنيو';
  $('#cats').innerHTML=data.categories.map(x=>`<button class="cat ${String(x.id)===String(data.cat)?'active':''}" data-open-cat="${x.id}">${esc(x.name)}</button>`).join('');
  let ps=data.products.filter(p=>available(p)&&String(p.category_id)===String(data.cat)&&(!data.q||p.name.toLowerCase().includes(data.q.toLowerCase())));
  $('#status').style.display='none';
  $('#products').innerHTML=ps.length?ps.map(p=>`<article class="product-card" data-product="${p.id}"><div class="photo">${p.image_url?`<img src="${esc(p.image_url)}" loading="lazy">`:'<div class="fallback">🍔</div>'}</div><button class="plus" data-add="${p.id}">+</button><div class="product-body"><h3>${esc(p.name)}</h3><div class="price">${productDisplayPrice(p)}</div></div></article>`).join(''):'<div class="empty">لا توجد أصناف مطابقة</div>'
}
function ensureModalSections(){
  const sheet=$('#productModal .sheet');
  if(!$('#variantBox')){
    const box=document.createElement('div');box.id='variantBox';box.className='choice-box hidden';box.innerHTML='<h3>اختار الحجم</h3><div id="variantOptions" class="choice-grid"></div>';
    $('#modalPrice').after(box);
  }
  if(!$('#extrasBox')){
    const box=document.createElement('div');box.id='extrasBox';box.className='choice-box hidden';box.innerHTML='<h3>الإضافات</h3><div id="extraOptions" class="extras-list"></div>';
    $('#variantBox').after(box);
  }
}
function openProduct(id){
  ensureModalSections();
  const p=data.products.find(x=>String(x.id)===String(id));if(!p)return;
  data.selected=p;data.selectedExtras=new Set();
  const vs=productVariants(p);data.selectedVariant=vs[0]||null;
  $('#modalName').textContent=p.name;$('#modalImg').src=p.image_url||'';$('#modalImg').style.display=p.image_url?'block':'none';$('#modalNotes').value='';
  if(vs.length){
    $('#variantBox').classList.remove('hidden');
    $('#variantOptions').innerHTML=vs.map((v,i)=>`<button class="variant-option ${i===0?'active':''}" data-variant="${v.id}"><b>${esc(v.name)}</b><span>${money(v.price)}</span></button>`).join('');
    $('#modalPrice').textContent=money(vs[0].price);
  }else{$('#variantBox').classList.add('hidden');$('#modalPrice').textContent=money(priceFor(p))}
  const extras=productExtras(p);
  if(extras.length){
    $('#extrasBox').classList.remove('hidden');
    $('#extraOptions').innerHTML=extras.map(m=>`<label class="extra-row"><input type="checkbox" data-extra="${m.id}"><span>${esc(m.name)}</span><b>+ ${money(m.price)}</b></label>`).join('');
  }else $('#extrasBox').classList.add('hidden');
  $('.notes-label').style.display=p.allow_item_notes===false?'none':'block';
  $('#productModal').classList.remove('hidden');
}
function currentUnitPrice(){
  const base=data.selectedVariant?Number(data.selectedVariant.price||0):priceFor(data.selected);
  const extras=[...data.selectedExtras].map(id=>data.modifiers.find(m=>String(m.id)===String(id))).filter(Boolean).reduce((s,m)=>s+Number(m.price||0),0);
  return base+extras;
}
function refreshModalPrice(){$('#modalPrice').textContent=money(currentUnitPrice())}
function addSelected(){
  if(!data.selected)return;
  const chosenExtras=[...data.selectedExtras].map(id=>data.modifiers.find(m=>String(m.id)===String(id))).filter(Boolean).map(m=>({id:m.id,name:m.name,price:Number(m.price||0)}));
  data.cart.push({key:Date.now()+Math.random(),product_id:data.selected.id,name:data.selected.name,variant_id:data.selectedVariant?.id||null,variant_name:data.selectedVariant?.name||'',base_price:data.selectedVariant?Number(data.selectedVariant.price||0):priceFor(data.selected),extras:chosenExtras,price:currentUnitPrice(),qty:1,notes:$('#modalNotes').value.trim()});
  $('#productModal').classList.add('hidden');renderCart();
}
function renderCart(){
  const count=data.cart.reduce((s,x)=>s+x.qty,0),total=data.cart.reduce((s,x)=>s+x.qty*x.price,0);
  $('#cartCount').textContent=count;$('#cartTotal').textContent=money(total);$('#cartModalTotal').textContent=money(total);
  $('#cartItems').innerHTML=data.cart.length?data.cart.map(x=>{const details=[x.variant_name, ...(x.extras||[]).map(e=>e.name), x.notes].filter(Boolean).join(' • ');return `<div class="cart-item"><div><b>${esc(x.name)}</b><small>${money(x.price)}${details?' • '+esc(details):''}</small></div><div class="qty"><button data-minus="${x.key}">−</button><b>${x.qty}</b><button data-plus="${x.key}">+</button></div></div>`}).join(''):'<div class="empty">السلة فاضية</div>'
}
function qty(key,d){const x=data.cart.find(i=>String(i.key)===String(key));if(!x)return;x.qty+=d;if(x.qty<=0)data.cart=data.cart.filter(i=>i!==x);renderCart()}

document.addEventListener('click',e=>{if(e.target.closest('[data-choose-branch]')){chooseBranch(e.target.closest('[data-choose-branch]').dataset.chooseBranch);return;}
  const cat=e.target.closest('[data-open-cat]');if(cat)openCategory(cat.dataset.openCat);
  const add=e.target.closest('[data-add]');if(add){e.stopPropagation();openProduct(add.dataset.add)}
  const card=e.target.closest('[data-product]');if(card&&!add)openProduct(card.dataset.product);
  const close=e.target.closest('[data-close]');if(close)$('#'+close.dataset.close).classList.add('hidden');
  const vo=e.target.closest('[data-variant]');if(vo){const v=data.variants.find(x=>String(x.id)===String(vo.dataset.variant));if(v){data.selectedVariant=v;document.querySelectorAll('.variant-option').forEach(x=>x.classList.remove('active'));vo.classList.add('active');refreshModalPrice()}}
  if(e.target.dataset.plus)qty(e.target.dataset.plus,1);if(e.target.dataset.minus)qty(e.target.dataset.minus,-1)
});
document.addEventListener('change',e=>{if(e.target.matches('[data-extra]')){const id=String(e.target.dataset.extra);e.target.checked?data.selectedExtras.add(id):data.selectedExtras.delete(id);refreshModalPrice()}});

$('#backBtn').onclick=()=>{$('#productsView').classList.add('hidden');$('#categoryView').classList.remove('hidden');data.q='';$('#search').value=''};
$('#branch').onchange=e=>changeBranch(e.target.value);
$('#searchBtn').onclick=()=>$('#searchBar').classList.toggle('hidden');$('#closeSearch').onclick=()=>$('#searchBar').classList.add('hidden');
$('#search').oninput=e=>{data.q=e.target.value.trim();if($('#productsView').classList.contains('hidden')&&data.categories[0])openCategory(data.categories[0].id);renderProducts()};
$('#addToCart').onclick=addSelected;$('#cartBar').onclick=()=>$('#cartModal').classList.remove('hidden');
$('#checkoutBtn').onclick=async()=>{if(!data.cart.length)return;try{const latest=await get(`branch_website_settings?select=branch_id,orders_open,orders_paused_until,prep_min,prep_max&branch_id=eq.${Number(data.branch)}`);if(latest?.[0]){data.branchSettings=data.branchSettings.filter(x=>String(x.branch_id)!==String(data.branch));data.branchSettings.push(latest[0])}}catch(e){}if(!branchOpen())return alert('الفرع أوقف استقبال طلبات الموقع حاليًا. اختار فرع تاني أو جرّب بعد شوية.');renderBranch();renderWebsitePayments();if(!branchPaymentRows().length)return alert('لا توجد طرق دفع متاحة على الموقع لهذا الفرع');$('#checkoutTotal').textContent=money(data.cart.reduce((s,x)=>s+x.qty*x.price,0));$('#cartModal').classList.add('hidden');$('#checkoutModal').classList.remove('hidden')};
$('#submitOrder').onclick=async()=>{
  try{const latest=await get(`branch_website_settings?select=branch_id,orders_open,orders_paused_until,prep_min,prep_max&branch_id=eq.${Number(data.branch)}`);if(latest?.[0]){data.branchSettings=data.branchSettings.filter(x=>String(x.branch_id)!==String(data.branch));data.branchSettings.push(latest[0])}}catch(e){}
  if(!branchOpen())return alert('الفرع أوقف استقبال طلبات الموقع حاليًا. لم يتم إرسال الطلب.');
  const name=$('#customerName').value.trim(),phone=$('#customerPhone').value.trim(),address=$('#deliveryAddress').value.trim(),notes=$('#orderNotes').value.trim();
  if(name.length<2)return alert('اكتب اسم العميل');if(phone.replace(/\D/g,'').length<8)return alert('اكتب رقم موبايل صحيح');if(address.length<5)return alert('اكتب عنوان التوصيل');
  const btn=$('#submitOrder');btn.disabled=true;btn.textContent='جاري إرسال الطلب...';
  try{
    const items=data.cart.map(x=>({
      product_id:x.product_id,
      variant_id:x.variant_id,
      quantity:x.qty,
      modifiers:(x.extras||[]).map(e=>({modifier_id:e.id})),
      notes:x.notes||''
    }));
    const pay=branchPaymentRows().find(x=>String(x.code)===String(data.selectedPayment));if(!pay)throw new Error('اختار طريقة دفع');
    const receiptFile=$('#paymentReceipt')?.files?.[0]||null;const receiptPath=receiptFile?await uploadPaymentReceipt(receiptFile):null;
    const reference=$('#paymentReference')?.value?.trim()||null;
    const d=await rpc('create_website_order',{p_branch_id:Number(data.branch),p_customer_name:name,p_customer_phone:phone,p_customer_address:address,p_customer_notes:notes,p_items:items,p_payment_method_code:pay.code,p_payment_reference:reference,p_payment_receipt_path:receiptPath});
    const orderId=Number(d);
    data.cart=[];renderCart();$('#checkoutModal').classList.add('hidden');$('#websiteOrderCode').textContent='WEB-'+String(orderId).padStart(5,'0');$('#successModal').classList.remove('hidden');
    $('#customerName').value='';$('#customerPhone').value='';$('#deliveryAddress').value='';$('#orderNotes').value='';if($('#paymentReference'))$('#paymentReference').value='';if($('#paymentReceipt'))$('#paymentReceipt').value='';
  }catch(e){alert(e.message||'تعذر إرسال الطلب')}finally{btn.disabled=false;btn.textContent='تأكيد الطلب'}
};

$('#menuBtn').onclick=openDrawer;
document.addEventListener('click',e=>{
  if(e.target.closest('[data-drawer-close]'))closeDrawer();
  if(e.target.closest('[data-drawer-track]')){closeDrawer();$('#trackModal').classList.remove('hidden')}
  if(e.target.closest('[data-drawer-locations]')){closeDrawer();showLocations()}
  if(e.target.closest('[data-drawer-contact]')){closeDrawer();showLocations()}
  const pc=e.target.closest('[data-pay-code]');if(pc){data.selectedPayment=pc.dataset.payCode;renderWebsitePayments()}
  const co=e.target.closest('[data-cancel-order]');if(co)cancelCustomerOrder(co.dataset.cancelOrder);
});
$('#trackOrderBtn').onclick=trackOrder;
load();
setInterval(()=>{if(data.branches.length){if(!$('#branchGate').classList.contains('hidden'))renderBranchGate();if(data.branch)renderBranch()}},30000);
