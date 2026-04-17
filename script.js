// 定义渐变色配置 (与 CSS 保持一致)
const GRADIENTS = {
    'type-blue':   ['#104e8b', '#4682b4'],
    'type-teal':   ['#008080', '#20b2aa'],
    'type-orange': ['#b03060', '#d2691e'],
    'type-red':    ['#8b0000', '#b22222'],
    'type-yellow': ['#d4ac0d', '#f1c40f'],
    'type-green':  ['#2e8b57', '#3cb371']
};

let library =[]; 
let scriptIds =[]; // 核心修改：将 Set 改为 Array 以便保存自定义排序
let tempImgSrc = "";
let isDragging = false; // 新增：用于判断用户是在拖拽还是点击
let customJinxes =[]; // 新增：保存用户自定义的相克规则

let isSortingLocked = false; // 默认不锁定
let sortableInstances =[];  // 用于保存和管理生成的拖拽实例

// 阵营中英文映射
const SCH_TEAM_MAP = {
    'townsfolk': '镇民',
    'outsider': '外来者',
    'minion': '爪牙',
    'demon': '恶魔',
    'fabled': '传奇角色',
    'loric': '奇遇角色'
};

// 页面打开时加载官方角色库
window.onload = function() { loadPresets(); };

// 左侧三个菜单栏的切换
function switchTab(tabName) {
    // 隐藏所有面板
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    // 显示目标面板
    document.getElementById('panel-' + tabName).classList.add('active');
    
    // 激活对应按钮 (根据 tabName 找到索引)
    let index = 0;
    if (tabName === 'custom-lib') index = 1;
    if (tabName === 'create') index = 2;
    document.querySelectorAll('.tab-btn')[index].classList.add('active');
}

// 从剧本图跳转到侧边栏
function jumpToCategory(team) {
    // A. 判断当前处于哪个 Tab
    const activePanel = document.querySelector('.tab-content.active');
    const activeId = activePanel ? activePanel.id : 'panel-official';
    
    let targetTab = 'official'; 

    // 判断逻辑：如果是在自定义相关页面，就跳去自定义库，否则去官方库
    if (activeId === 'panel-custom-lib' || activeId === 'panel-create') {
        targetTab = 'custom-lib';
    }

    // B. 切换 Tab
    switchTab(targetTab);

    // C. 定位目标组
    const targetPanel = document.getElementById('panel-' + targetTab);
    // 通过 data-team 属性精确找到对应的 .lib-group
    const targetGroup = targetPanel.querySelector(`.lib-group[data-team="${team}"]`);

    // D.定位到特定的角色类型
    if (targetGroup) {
        // 1. 强制展开目标组
        targetGroup.classList.remove('collapsed');

        // 2. 滚动定位与视觉反馈
        // 使用 setTimeout 给 DOM 一点渲染时间
        setTimeout(() => {
            targetGroup.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
            // 闪烁一下标题背景
            const header = targetGroup.querySelector('.lib-group-header');
            if(header) {
                // 保存原始样式以便恢复
                const originalTransition = header.style.transition;
                header.style.transition = "background 0.3s, color 0.3s";
                
                header.style.background = 'rgba(197, 160, 89, 0.4)'; // 金色高亮
                header.style.color = '#fff';
                
                setTimeout(() => {
                    header.style.background = 'transparent';
                    header.style.color = '';
                    header.style.transition = originalTransition;
                }, 800);
            }
        }, 50);
    }
}

document.getElementById('in-image').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if(file){
        const reader = new FileReader();
        reader.onload = evt => {
            tempImgSrc = evt.target.result;
            document.getElementById('img-preview').src = tempImgSrc;
            document.getElementById('preview-box').style.display = 'flex';
        };
        reader.readAsDataURL(file);
    }
});

// 重置表单
function resetForm() {
    document.getElementById('in-name').value = "";
    document.getElementById('in-name-en').value = "";
    document.getElementById('in-ability').value = "";
    document.getElementById('in-first').value = "";
    document.getElementById('in-other').value = "";
    document.getElementById('in-reminder').value = "";
    document.getElementById('in-setup').checked = false;
    
    document.getElementById('in-image').value = "";
    document.getElementById('img-preview').src = "";
    document.getElementById('preview-box').style.display = 'none';
    tempImgSrc = "";
}

// 创建自定义角色
function createRoleToLibrary() {
    // 1. 获取基础输入
    const name = document.getElementById('in-name').value.trim();
    const nameEn = document.getElementById('in-name-en').value.trim(); // 用于生成ID和英文显示
    
    if(!name) return alert("请输入角色名称");
    
    // 2. 获取其他属性
    const teamVal = document.getElementById('in-team').value; //阵营
    const firstNightVal = parseInt(document.getElementById('in-first').value) || 0; // 首夜行动
    const otherNightVal = parseInt(document.getElementById('in-other').value) || 0; //其他夜行动
    const reminderVal = document.getElementById('in-reminder').value.trim(); // 提示标记
    const setupVal = document.getElementById('in-setup').checked; // 是否更改角色配置

    // 3. 构建新数据对象
    const role = {
        id: nameEn ? nameEn.toLowerCase().replace(/\s+/g, '_') : 'custom_' + Date.now(),
        image: tempImgSrc || `https://ui-avatars.com/api/?name=${name}&background=random&rounded=true`,
        name: name,
        nameEn: nameEn,
        ability: document.getElementById('in-ability').value,
        team: teamVal,
        sch_team: SCH_TEAM_MAP[teamVal] || "",
        firstnight: parseInt(document.getElementById('in-first').value) || 0,
        othernight: parseInt(document.getElementById('in-other').value) || 0,
        reminder: document.getElementById('in-reminder').value.trim(),
        setup: document.getElementById('in-setup').checked,

        // 标记为自定义角色
        isCustom: true 
    };
    
    library.push(role);
    renderLibrary(); // 重新渲染列表
    switchTab('custom-lib'); // 【修改】：跳转到自定义角色库 Tab
    resetForm();
}

// 加载预设
function loadPresets() {
    // 这里的 OFFICIAL_ROLES 就是从 roles_data.js 里读取过来的
    // 检查一下数据文件是否加载成功
    if (typeof OFFICIAL_ROLES === 'undefined') {
        console.error("错误：未找到角色数据文件，请检查 roles_data.js 是否正确引入。");
        return;
    }

    // 遍历大数据数组，加入到当前的 library 中
    OFFICIAL_ROLES.forEach(p => {
        // 防止重复添加 (根据id判断)
        if(!library.find(x => x.id === p.id)) {
            p.nameEn = p.id;
            p.isCustom = false; // 明确标记为非自定义角色
            library.push(p);
        }
    });

    // 重新渲染左侧列表
    renderLibrary();
    
}
function renderLibrary() {
    const categories = ['townsfolk', 'outsider', 'minion', 'demon', 'fabled', 'loric'];
    
    // A. 清空官方库 DOM
    categories.forEach(t => {
        const el = document.getElementById(`list-official-${t}`);
        if(el) el.innerHTML = '';
    });

    // B. 清空自定义库 DOM
    categories.forEach(t => {
        const el = document.getElementById(`list-custom-${t}`);
        if(el) el.innerHTML = '';
    });
    
    // 获取两个搜索框的值
    const searchOfficial = document.getElementById('search-official') ? document.getElementById('search-official').value.toLowerCase() : "";
    const searchCustom = document.getElementById('search-custom') ? document.getElementById('search-custom').value.toLowerCase() : "";

    let hasCustomRoles = false;

    // C. 遍历总库，分流渲染
    library.forEach(role => {
        // 判断是官方还是自定义
        const isCustom = !!role.isCustom;
        
        // 根据对应的搜索框进行过滤
        const filterText = isCustom ? searchCustom : searchOfficial;
        if (!role.name.toLowerCase().includes(filterText) && 
            !(role.nameEn && role.nameEn.toLowerCase().includes(filterText))) {
            return; // 不符合搜索条件，跳过
        }

        // 确定挂载的目标容器 ID 前缀
        const prefix = isCustom ? 'list-custom-' : 'list-official-';
        const container = document.getElementById(`${prefix}${role.team}`);
        
        if (!container) return;

        if (isCustom) hasCustomRoles = true;

        const isSelected = scriptIds.includes(role.id);
        const item = document.createElement('div');
        item.className = `lib-item ${isSelected ? 'selected' : ''}`;
        item.onclick = () => toggleRole(role.id);

        item.innerHTML = `
            <img src="${role.image}">
            <span>${role.name}</span>
            <i class="fas fa-check check-mark"></i>
        `;
        container.appendChild(item);
    });

    // D. 控制自定义库的空状态提示
    const emptyMsg = document.getElementById('custom-empty-msg');
    if (emptyMsg) {
        emptyMsg.style.display = hasCustomRoles ? 'none' : 'block';
    }
    
    // E. 【新增】搜索时的自动展开逻辑
    // 如果有搜索词，则展开所有包含结果的组，折叠空的组
    // 如果没有搜索词（filterText为空），则保持用户当前的操作状态，或者全部展开（看你喜好，这里选择不干预）
    
    const isSearchingOfficial = document.getElementById('search-official').value.trim() !== "";
    const isSearchingCustom = document.getElementById('search-custom').value.trim() !== "";

    if (isSearchingOfficial) {
        autoExpandGroups('panel-official');
    }
    if (isSearchingCustom) {
        autoExpandGroups('panel-custom-lib');
    }


}
// 辅助函数：根据是否有子元素自动展开/折叠
function autoExpandGroups(panelId) {
    const panel = document.getElementById(panelId);
    if(!panel) return;
    const groups = panel.querySelectorAll('.lib-group');
    
    groups.forEach(group => {
        const list = group.querySelector('.lib-list-container');
        // 如果列表里有内容 (div.lib-item)，则展开，否则折叠
        if (list.children.length > 0) {
            group.classList.remove('collapsed');
        } else {
            group.classList.add('collapsed');
        }
    });
}
function filterLibrary(source) { renderLibrary(); }
function toggleRole(id) {
    if(scriptIds.includes(id)) { 
    scriptIds = scriptIds.filter(i => i !== id); 
    } else { 
        scriptIds.push(id); 
    }
    renderLibrary(); renderScript();
}



function renderScript() {
    // 👇 新增：在每次重新渲染前，销毁旧的拖拽实例，防止越积越多引发 Bug
    sortableInstances.forEach(instance => instance.destroy());
    sortableInstances = [];
    
    const categories =['townsfolk', 'outsider', 'minion', 'demon', 'fabled', 'loric'];
    const activeRoles = scriptIds.map(id => library.find(r => r.id === id)).filter(Boolean);
    
    document.getElementById('night-first-col').innerHTML = '';
    document.getElementById('night-other-col').innerHTML = '';

    categories.forEach(t => {
        const grid = document.getElementById(`grid-${t}`);
        const section = document.getElementById(`section-${t}`);
        if(!grid) return;
        
        grid.innerHTML = '';
        
        const rolesInThisCat = activeRoles.filter(r => r.team === t);
        const count = rolesInThisCat.length;

        if (t === 'fabled' || t === 'loric') {
            if (count === 0) { section.style.display = 'none'; return; } 
            else { section.style.display = 'block'; }
        } 
        
        const headerTitle = section.querySelector('.header-title');
        if(headerTitle) headerTitle.innerText = t.toUpperCase();

        if (count === 0) {
            grid.innerHTML = `<div class="empty-placeholder" onclick="jumpToCategory('${t}')"><i class="fas fa-plus"></i> Add ${t.charAt(0).toUpperCase() + t.slice(1)}</div>`;
        } else {
            rolesInThisCat.forEach(role => {
                const card = document.createElement('div');
                card.className = 'script-role';
                card.setAttribute('data-id', role.id);
                
                card.onclick = (e) => {
                    if (isDragging) return; 
                    toggleRole(role.id);
                };
                card.title = "Click to remove, Drag to reorder";

                let safeImageSrc = role.image;
                if (role.image.startsWith('http')) {
                    safeImageSrc = `https://wsrv.nl/?url=${encodeURIComponent(role.image)}&output=png`;
                }

                card.innerHTML = `
                    <img src="${safeImageSrc}" crossorigin="anonymous" draggable="false">
                    <div class="script-role-info">
                        <h4>${role.name} <span class="role-en-name">${role.nameEn || ''}</span></h4>
                        <p>${role.ability}</p>
                    </div>
                `;
                grid.appendChild(card);
            });

            // 将新生成的实例存入数组，并支持 disabled 属性 
            const sortable = new Sortable(grid, {
                animation: 150,
                disabled: isSortingLocked, // 根据当前状态决定是否禁用拖拽
                ghostClass: 'sortable-ghost',
                onStart: function (evt) {
                    isDragging = true;
                },
                onEnd: function (evt) {
                    setTimeout(() => { isDragging = false; }, 50);
                    updateScriptIdsFromDOM();
                }
            });
            sortableInstances.push(sortable); // 保存实例
        }
    });

    const firstRoles = activeRoles.filter(r => r.firstNight > 0).sort((a,b)=>a.firstNight - b.firstNight);
    const otherRoles = activeRoles.filter(r => r.otherNight > 0).sort((a,b)=>a.otherNight - b.otherNight);
    firstRoles.forEach(r => addNightIcon('night-first-col', r));
    otherRoles.forEach(r => addNightIcon('night-other-col', r));

    // 处理自动相克规则 (Jinxes) 的渲染
    // ==========================================
    const jinxArea = document.getElementById('jinx-area');
    const jinxList = document.getElementById('jinx-list');
    jinxList.innerHTML = '';
    
    let activeJinxes =[];

    // 1. 自动比对剧本中所有选中的角色
    for (let i = 0; i < activeRoles.length; i++) {
        for (let j = i + 1; j < activeRoles.length; j++) {
            const r1 = activeRoles[i];
            const r2 = activeRoles[j];
            
            let jinxText = null;
            // 确保 jinx.js 中的全局变量 jinx 存在
            if (typeof jinx !== 'undefined') {
                // 检查正向映射
                if (jinx[r1.name] && jinx[r1.name][r2.name]) {
                    jinxText = jinx[r1.name][r2.name];
                } 
                // 检查反向映射
                else if (jinx[r2.name] && jinx[r2.name][r1.name]) {
                    jinxText = jinx[r2.name][r1.name];
                }
            }
            if (jinxText) {
                activeJinxes.push({ roleA: r1, roleB: r2, text: jinxText, isCustom: false });
            }
        }
    }

    // 2. 混入用户在此次排版中自己填写的 Custom Jinxes
    customJinxes.forEach(cj => {
        const r1 = activeRoles.find(r => r.id === cj.roleAId);
        const r2 = activeRoles.find(r => r.id === cj.roleBId);
        // 只有当两个角色当前都在场上时，才显示这条自定义规则
        if (r1 && r2) {
            activeJinxes.push({ roleA: r1, roleB: r2, text: cj.text, isCustom: true, id: cj.id });
        }
    });

    // 3. 渲染到页面
    if (activeJinxes.length === 0) {
        jinxArea.style.display = 'none'; // 如果没有任何规则，彻底隐藏该区域
    } else {
        jinxArea.style.display = 'block';
        activeJinxes.forEach(jObj => {
            const div = document.createElement('div');
            div.className = 'jinx-item';
            
            // 同样需要进行 wsrv.nl 的图片代理，防止导出 Canvas 时报跨域错
            let safeImgA = jObj.roleA.image.startsWith('http') ? `https://wsrv.nl/?url=${encodeURIComponent(jObj.roleA.image)}&output=png` : jObj.roleA.image;
            let safeImgB = jObj.roleB.image.startsWith('http') ? `https://wsrv.nl/?url=${encodeURIComponent(jObj.roleB.image)}&output=png` : jObj.roleB.image;
            
            div.innerHTML = `
                <div class="jinx-icons">
                    <img src="${safeImgA}" crossorigin="anonymous">
                    <i class="fas fa-times jinx-cross-icon"></i> <!-- 两者之间的冲突叉号 -->
                    <img src="${safeImgB}" crossorigin="anonymous">
                </div>
                <div class="jinx-text">${jObj.text}</div>
                ${jObj.isCustom ? `<i class="fas fa-trash-alt jinx-delete" onclick="deleteCustomJinx('${jObj.id}')" title="删除此自定义相克规则"></i>` : ''}
            `;
            jinxList.appendChild(div);
        });
    }


}

// 新增函数：从 DOM 读取排序并更新 scriptIds
function updateScriptIdsFromDOM() {
    let newOrder =[];
    const categories = ['townsfolk', 'outsider', 'minion', 'demon', 'fabled', 'loric'];
    
    // 遍历所有类别的网格，按玩家拖动后的新 DOM 顺序提取角色 ID
    categories.forEach(t => {
        const grid = document.getElementById(`grid-${t}`);
        if (grid) {
            const cards = grid.querySelectorAll('.script-role');
            cards.forEach(card => {
                const id = card.getAttribute('data-id');
                if (id) {
                    newOrder.push(id);
                }
            });
        }
    });
    
    // 用新的顺序覆盖原本的 scriptIds 数组
    scriptIds = newOrder;
    
    // 重新渲染夜间行动条和视图，确保数据完全同步
    renderScript(); 
}

// 新增函数：切换锁定/解锁拖拽排序
function toggleSortLock() {
    isSortingLocked = !isSortingLocked;
    
    const btnIcon = document.querySelector('#lock-sort-btn i');
    const btn = document.getElementById('lock-sort-btn');
    const paper = document.getElementById('script-paper');
    
    if (isSortingLocked) {
        // 锁定状态下的样式变化
        btnIcon.className = 'fas fa-lock';
        btn.style.color = '#c0392b'; // 按钮变红，提示锁定状态
        btn.title = "解锁排序";
        paper.classList.add('sort-locked'); // 给画布添加专属的类，用于改变鼠标指针
    } else {
        // 解锁状态下的样式变化
        btnIcon.className = 'fas fa-lock-open';
        btn.style.color = ''; // 恢复默认颜色
        btn.title = "锁定排序 (防误触)";
        paper.classList.remove('sort-locked');
    }
    
    // 动态更新现有的所有拖拽实例
    sortableInstances.forEach(instance => {
        instance.option('disabled', isSortingLocked);
    });
}

function addNightIcon(containerId, role) {
    const img = document.createElement('img');
    
    // --- 修改开始 ---
    let safeImageSrc = role.image;
    if (role.image.startsWith('http')) {
        safeImageSrc = `https://wsrv.nl/?url=${encodeURIComponent(role.image)}&output=png`;
    }
    // --- 修改结束 ---

    img.src = safeImageSrc;
    img.crossOrigin = "anonymous"; 
    img.className = 'night-token'; 
    img.title = role.name;
    document.getElementById(containerId).appendChild(img);
}


// --- 核心修改：导出函数 ---
function exportImage() {
    const el = document.getElementById('script-paper');
    
    // 1. 获取文件名
    let titleText = document.getElementById('script-title-edit').innerText.trim();
    if (!titleText || titleText === 'Script Name') titleText = 'MyScript';
    let authorText = document.getElementById('script-author-edit').innerText.trim();
    authorText = authorText.replace(/^by\s+/i, ''); 
    if (!authorText || authorText === 'Author') authorText = 'Anonymous';
    const filename = `${titleText}_by${authorText}.png`;

    // 2. 【核心修复】将渐变文字转换为图片
    const headers = el.querySelectorAll('.header-title');
    const restoreTasks = []; // 用于存储恢复操作

    headers.forEach(h => {
        const parent = h.closest('.section-header');
        let colors = ['#333', '#333']; // 默认颜色

        // 匹配颜色
        if (parent.classList.contains('type-blue')) colors = GRADIENTS['type-blue'];
        else if (parent.classList.contains('type-teal')) colors = GRADIENTS['type-teal'];
        else if (parent.classList.contains('type-orange')) colors = GRADIENTS['type-orange'];
        else if (parent.classList.contains('type-red')) colors = GRADIENTS['type-red'];
        else if (parent.classList.contains('type-yellow')) colors = GRADIENTS['type-yellow'];
        else if (parent.classList.contains('type-green')) colors = GRADIENTS['type-green'];

        // 生成渐变文字图片
        const img = textToGradientImage(h.innerText, h, colors);
        
        // 隐藏原文字，插入图片
        const originalDisplay = h.style.display;
        h.style.display = 'none';
        h.parentNode.insertBefore(img, h);

        // 记录恢复任务
        restoreTasks.push(() => {
            img.remove();
            h.style.display = originalDisplay;
        });
    });

    // 3. 执行截图
    html2canvas(el, { 
        scale: 2, 
        useCORS: true, // 必须开启以支持代理后的图片
        allowTaint: true,
        backgroundColor: null 
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL();
        link.click();
        
        // 恢复现场
        restoreTasks.forEach(task => task());
    }).catch(err => {
        console.error("导出失败:", err);
        alert("导出遇到问题，请检查网络或图片源。");
        restoreTasks.forEach(task => task());
    });
}

// 辅助函数：用 Canvas 绘制渐变文字并转为图片
function textToGradientImage(text, originalElement, colors) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const computedStyle = window.getComputedStyle(originalElement);

    // 设置字体属性
    const fontSize = parseFloat(computedStyle.fontSize) * 2; // 放大2倍绘制以防模糊
    const fontFamily = computedStyle.fontFamily;
    const fontWeight = computedStyle.fontWeight;
    
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    
    // 测量文字宽度
    const metrics = ctx.measureText(text);
    canvas.width = metrics.width;
    canvas.height = fontSize * 1.2; // 稍微多一点高度容纳字高

    // 重新设置字体（修改canvas大小后会重置上下文）
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';

    // 创建渐变
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);

    // 绘制文字
    ctx.fillStyle = gradient;
    ctx.fillText(text, 0, 0);

    // 生成图片元素
    const img = new Image();
    img.src = canvas.toDataURL('image/png');
    
    // 设置图片样式以匹配原文位置
    img.style.height = computedStyle.fontSize; // 显示高度还原
    img.style.width = 'auto';
    img.style.verticalAlign = 'bottom';
    
    return img;
}

function clearScript() {
    if(confirm("确定清空当前剧本吗？")) { 
        scriptIds =[]; 
        customJinxes =[]; // 同步清空自定义相克
        renderLibrary(); 
        renderScript(); 
    }
}

// --- 新增：切换英文名显示 ---
function toggleEnglishNames() {
    const paper = document.getElementById('script-paper');
    // 切换 class，CSS 中定义了 .hide-en .role-en-name { display: none }
    paper.classList.toggle('hide-en');
    
    // 可选：给按钮添加一点反馈动画或状态改变，这里暂略
}

function toggleSidebar() {
    document.body.classList.toggle('sidebar-collapsed');
    window.dispatchEvent(new Event('resize'));
}

/* =========================================
   快速搜索悬浮窗逻辑
   ========================================= */

/* =========================================
   快速搜索悬浮窗逻辑 (Updated)
   ========================================= */

// 1. 打开/切换搜索窗
function toggleQuickSearch(e) {
    // 阻止冒泡，防止触发 document 的点击关闭事件
    if(e) e.stopPropagation();

    const panel = document.getElementById('quick-search-panel');
    const input = document.getElementById('qs-input');
    
    // 切换激活状态
    const isActive = panel.classList.contains('active');
    
    if (isActive) {
        closeQuickSearch();
    } else {
        panel.classList.add('active');
        input.value = '';
        renderQuickSearchResults(''); // 清空或显示初始状态
        input.focus();
        
        // 添加全局点击监听，用于点击外部关闭
        document.addEventListener('click', handleClickOutside);
    }
}

// 2. 关闭搜索窗
function closeQuickSearch() {
    const panel = document.getElementById('quick-search-panel');
    panel.classList.remove('active');
    document.removeEventListener('click', handleClickOutside);
}

// 3. 点击外部关闭逻辑
function handleClickOutside(e) {
    const panel = document.getElementById('quick-search-panel');
    const triggerBtn = document.getElementById('qs-trigger-btn'); // 通过 ID 获取，更稳健
    
    // 如果 triggerBtn 没找到（防御性编程），只判断面板
    if (!triggerBtn) {
        if (panel && !panel.contains(e.target)) {
            closeQuickSearch();
        }
        return;
    }
    
    // 逻辑：如果点击的区域 既不是面板内部，也不是触发按钮本身，则关闭
    if (panel && !panel.contains(e.target) && !triggerBtn.contains(e.target)) {
        closeQuickSearch();
    }
}

// 4. 监听输入 (保持不变)
document.getElementById('qs-input').addEventListener('input', function(e) {
    renderQuickSearchResults(e.target.value.trim());
});

// 5. 渲染逻辑 (保持不变)
function renderQuickSearchResults(query) {
    const container = document.getElementById('qs-results');
    container.innerHTML = ''; 

    if (!query) {
        container.innerHTML = '<div class="qs-empty-tip">请输入角色名查找...</div>';
        return;
    }

    const lowerQuery = query.toLowerCase();
    
    // 搜索官方库和自定义库
    const matches = library.filter(role => {
        return role.name.toLowerCase().includes(lowerQuery) || 
               (role.nameEn && role.nameEn.toLowerCase().includes(lowerQuery));
    });

    if (matches.length === 0) {
        container.innerHTML = '<div class="qs-empty-tip">未找到相关角色</div>';
        return;
    }

    matches.forEach(role => {
        const div = document.createElement('div');
        const isAdded = scriptIds.includes(role.id);
        div.className = `qs-item ${isAdded ? 'added' : ''}`;
        
        div.onclick = function(e) {
            e.stopPropagation(); // 防止点击条目时触发关闭
            
            toggleRole(role.id); // 添加/删除
            
            // 更新当前项视觉
            if (scriptIds.includes(role.id)) div.classList.add('added');
            else div.classList.remove('added');
            
            // 保持搜索框开启，方便连续添加
        };

        div.innerHTML = `
            <img src="${role.image}">
            <div class="qs-info">
                <h4>${role.name} <small>${role.nameEn || ''}</small></h4>
                <small>[${role.sch_team || role.team}]</small>
            </div>
        `;
        container.appendChild(div);
    });
}

// 1. 手动点击标题折叠/展开
function toggleGroup(headerElement) {
    const group = headerElement.parentElement;
    group.classList.toggle('collapsed');
}


// ==========================================
// 自定义相克规则 (Jinx Modal) 控制逻辑
// ==========================================
function openJinxModal() {
    // 获取当前已在剧本中的角色
    const activeRoles = scriptIds.map(id => library.find(r => r.id === id)).filter(Boolean);
    if(activeRoles.length < 2) {
        alert("请先在左侧选择至少两个角色加入剧本！");
        return;
    }
    
    const selectA = document.getElementById('jinx-role-a');
    const selectB = document.getElementById('jinx-role-b');
    selectA.innerHTML = ''; selectB.innerHTML = '';
    
    // 填充下拉选项
    activeRoles.forEach(r => {
        const optA = document.createElement('option');
        optA.value = r.id; optA.textContent = `${r.name} ${r.nameEn || ''}`;
        selectA.appendChild(optA);
        
        const optB = document.createElement('option');
        optB.value = r.id; optB.textContent = `${r.name} ${r.nameEn || ''}`;
        selectB.appendChild(optB);
    });
    
    if(activeRoles.length > 1) selectB.selectedIndex = 1; // 默认选中不同的角色
    
    document.getElementById('jinx-desc').value = '';
    document.getElementById('jinx-modal').style.display = 'flex';
}

function closeJinxModal() {
    document.getElementById('jinx-modal').style.display = 'none';
}

function saveCustomJinx() {
    const roleAId = document.getElementById('jinx-role-a').value;
    const roleBId = document.getElementById('jinx-role-b').value;
    const text = document.getElementById('jinx-desc').value.trim();
    
    if (roleAId === roleBId) {
        alert("相克规则必须选择两个不同的角色！");
        return;
    }
    if (!text) {
        alert("请输入相克规则的描述！");
        return;
    }
    
    // 保存到自定义数组中
    customJinxes.push({
        id: 'custom_jinx_' + Date.now(),
        roleAId,
        roleBId,
        text
    });
    
    closeJinxModal();
    renderScript(); // 触发重新渲染，规则马上出现在底部
}

function deleteCustomJinx(id) {
    customJinxes = customJinxes.filter(j => j.id !== id);
    renderScript();
}

