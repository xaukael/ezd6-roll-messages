var ezd6 = {};
ezd6.d6pips = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'].map((p,i)=>i?`<i class="fa-solid fa-dice-${p}"></i>`:`<i class="fa-solid fa-square"></i>`);
ezd6.herodice = `<i class="fa-solid fa-square" style="color:limegreen;background:unset;border:unset;"></i>`;
ezd6.karma = `<i class="fa-solid fa-circle" style="color:gold;background:unset;border:unset;"></i>`;
ezd6.strikes = '<i class="fa-solid fa-heart"  style="color:red;background:unset;border:unset;"></i>';

ezd6.updateChatMessage = async function(id, update) {
  return await game.messages.get(id).update(update);
}

Hooks.once("socketlib.ready", () => {
	ezd6.socket = socketlib.registerModule("ezd6-roll-messages");
	ezd6.socket.register("updateChatMessage", ezd6.updateChatMessage);
});

Hooks.on('renderEZD6CharacterSheet', (app, html)=>{
  let actor = app.object;
  if (actor.type != 'character') return;
  let columns = [ 
  ["strikes.value",'<i class="fa-solid fa-heart"  style="color:red;" title="Strike"></i>', "Strikes"], 
  ["herodice", '<i class="fa-solid fa-square" style="color:limegreen;" title="Hero Die"></i>' , "Hero Die"],
  ["karma", '<i class="fa-solid fa-circle" style="color:gold;" title="Karma"></i>', "Karma"]
  ];
  let stats = 
  columns.reduce((acc, x, i)=>acc+=`<span>${Array(foundry.utils.getProperty(actor.system, x[0])+1).join(x[1]+"&nbsp;")}${i==0?Array(Math.max(actor.system.strikes.max-actor.system.strikes.value+1, 0)).join('<i class="fa-solid fa-heart" style="color: black;-webkit-text-stroke: 1px red;"></i>&nbsp;'):''}</span>`, `<span class="header-stats" style="margin-left:.5em;">`)+`<style>.ezd6.sheet.character.minimized{width:auto !important;}</style></span>`;
  app.element.find('.window-title > .header-stats').remove();
  app._element.find('.window-title').append(stats);
});

// adds a flag to the hook with results of d6 rolls
Hooks.on('preCreateChatMessage', async (message)=>{
  if (!message.rolls.length) return true;
  message.data.update({flags:{ezd6:{results: message.rolls[0].dice.filter(d=>d.faces==6).reduce((a,x)=>{return [...a, ...x.results]}, [])}}});
});

// this does all the formatting for chat messages using Font-Awesome d6 glyphs
Hooks.on('renderChatMessage', (message, html)=>{
  if (message.flavor.includes("Draws a result")) return;
  if (!message.rolls?.length) return;
  if (message.rolls[0].dice.filter(d=>d.faces==6).length!=message.rolls[0].dice.length) return; 
  html.find('.message-sender').css({color: message.user.color, fontWeight: 'bold'})
  let flavor = html.find('.flavor-text').text().trim();
  if (flavor) html.find('.flavor-text').html(`<h3>${flavor}</h3>`)

  if (!message.flags.ezd6?.results) return;
  //console.log(message.flags.ezd6.results);
  let results = [...message.flags.ezd6.results];
  let actions = [];
  if (message.flags.ezd6?.actions?.length)
    actions = [...message.flags.ezd6.actions];
  if (message.flavor.includes('Cast') && results.map(r=>r.result).includes(1))
    for (let r of results) 
      if (r.result == 1) r.active = true;
      else r.active = false;
  let content = results.reduce((acc, r, i)=> {
    let color = 'inherit';
    if (message.flavor.includes('Attack') && r.result == 6 && !r.discarded) color = "limegreen";
    if (r.hasOwnProperty('success') && !r.success) color ="grey";
    if (r.hasOwnProperty('discarded') && r.discarded) color ="grey";
    if (!r.active) color = "grey";
    if (message.flavor.includes('Spell') && r.result == 1) color = "red";
    return acc += `<span data-index="${i}" data-roll="${r.result}" class="die" style="position: relative; font-size: 32px; color: ${color};">${ezd6.d6pips[r.result]}</span>&nbsp;`;
    }, ``) + 
    actions.reduce((a,x)=>a+=`<p>${x}</p>`,``);
  if (message.flags.ezd6?.targets?.length && game.user.isGM)
    content = message.flags.ezd6?.targets.reduce((a,x)=>{
      let t = fromUuidSync(x);
      return a+=t?`<div style="display:grid; grid-template-columns: repeat(2, auto)">
        <span><img class="target" src="${t.texture.src}" width=45 style="padding: 3px;" data-id="${t.id}"></span>
        <div style="font-size: 8px"> To Hit:<br><span style="font-size: 30px">${ezd6.d6pips[t.actor.system.tohit]}</span></div>
      </div>`:``; 
    },`<div style="display: flex; flex-wrap: wrap">`) + `</div>`  + content;
  html.find('div.message-content').html(content);
  html.find('img.target').mouseover(function(e){
    let tok = canvas.tokens?.get($(this).data().id);
    let $div = $(`<div id="${tok.id}-marker" class="token-marker ${tok.id}" style="position: absolute; top: ${tok.y}px; left: ${tok.x}px; display:block;" data-tokenid="${tok.id}">
      <style>
      .token-marker {
        width: ${tok.w}px;
        height: ${tok.h}px;
        border: 3px solid red;
        border-radius: 8px;
      }
      </style></div>`);
      $('#hud').append($div);
  }).mouseout(function(e) {
    $('#hud').find('div.token-marker').remove();
  });
  
  if (!message.flavor.toUpperCase().includes('SPELL'))
    html.find('span.die').append(`<a class="karma" style="position:absolute;left:0px;" hidden="true">${ezd6.karma}</a>`)
  html.find('span.die').append(`<a class="herodice" style="position:absolute;right:0px;" hidden="true">${ezd6.herodice}</a>`)
  html.find('span.die *').css({background: 'unset'})
  html.find('span.die > a').css({fontSize: '12px', bottom: '-5px'})
  
  if (game.user==message.user || 
  game.user.character.items.filter(i=>i.name=='Inspiring').length ||
  (message.user.isGM && game.users.contents.flatMap(u=>u.character?.items.getName('Skald')).filter(i=>!!i).length))
  html.find('span.die')
  .mouseover(function(e){
    if ($(this).find('i').hasClass('fa-dice-six') ) return;
    if ($(this)[0].style.color == 'grey') return;
    if (!!game.user.character?.system?.karma && !$(this).find('i').hasClass('fa-dice-one')) $(this).find('a.karma').show()
    if (!!game.user.character?.system?.herodice) $(this).find('a.herodice').show()
  })
  .mouseout(function(e) {
      html.find('a.karma, a.herodice').hide()
  })
  if (game.user.isGM)
  html.find('span.die').click(async function(e){
    e.stopPropagation();
    let results = [...message.flags.ezd6?.results];
    let actions = [];
    if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
    let index = +$(this).data().index;
    let roll = +$(this).data().roll;
    if (e.ctrlKey) {
      actions.push(`${game.user.name} deleted die ${index+1} - ${ezd6.d6pips[results[index].result]}`);
      results.splice(index, 1);
      return message.update({flags:{ezd6:{results, actions}}});
    }
    if (e.shiftKey) {
        results[index].active = !results[index].active;
        results[index].discarded = !results[index].active;
        results[index].success = results[index].active;
        return message.update({flags:{ezd6:{results}}});
    }
    results[index].result = Math.clamped(roll + (e.originalEvent?-1:1), 0, 6);
    actions.push(`${game.user.name} ${e.originalEvent?"subtracted 1 from":"added 1 to"} die ${index+1} - ${ezd6.d6pips[results[index].result]}`);
    return message.update({flags:{ezd6:{results, actions}}})
    //await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
  }).contextmenu(function(){$(this).click()})
  
  html.find('a.karma').click(async function(e){
    e.stopPropagation();
    if (game.user.character.system.karma == 0) return ui.notifications.warn("You have no Karma left.");
    if (e.shiftKey) return;
    if (message.flavor.toUpperCase().includes('SPELL')) return ui.notifications.warn(`You cannot use Karma on spell cast rolls.`);
    let results = [...message.flags.ezd6?.results];
    let actions = [];
    if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
    let index = +$(this).parent().data().index;
    let roll = +$(this).parent().data().roll;
    if (results[index].discarded) return ui.notifications.warn(`You cannot use Karma on discarded rolls. Why would you?`);
    if (roll == 6) return ui.notifications.warn("Cannot use Karma on a roll of 6. Why would you?");
    results[index].result = roll + ((!game.user.isGM && message.user.isGM)?-1:1);
    if (results[index].hasOwnProperty('success') && results[index].result==6) results[index].success = true;
    actions.push(`${game.user.character?.name || game.user.name} used a Karma on die ${index+1} - ${ezd6.karma}`);
    //await message.update({flags:{ezd6:{results, actions}}});
    await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
    await game.user.character.update({system:{karma:game.user.character.system.karma-1}});
  });

  html.find('a.herodice').click(async function(e){
    e.stopPropagation();
    if (game.user.flags.ezd6.hd == 0) return ui.notifications.warn("You have no Hero Dice left.");
    let results = [...message.flags.ezd6?.results];
    let actions = [];
    if (message.flags.ezd6?.actions) actions = message.flags.ezd6?.actions;
    let index = +$(this).parent().data().index;
    let roll = +$(this).parent().data().roll;
    if (roll == 6) return ui.notifications.warn("Why would you try to use a Hero Die to reroll a 6?");
    if (results[index].discarded) return ui.notifications.warn(`You cannot use a Hero Die on a discarded roll. Why would you?`);
    let hd = await new Roll('1d6').roll();
    if (game.modules.get('dice-so-nice')?.active) await game.dice3d.showForRoll(hd, game.user, true);
    results[index].result = hd.total;
    actions.push(`${game.user.character?.name || game.user.name} used a Hero Die on die ${index+1} - ${ezd6.herodice}</i>`);
    if (results[index].hasOwnProperty('success') && results[index].result==6) results[index].success = true;
    //await message.update({flags:{ezd6:{results, actions}}})
    await ezd6.socket.executeAsGM("updateChatMessage", message.id, {flags:{ezd6:{results, actions}}});
    await game.user.character.update({system:{herodice:game.user.character.system.herodice-1}});
  });
})
