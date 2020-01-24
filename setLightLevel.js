async function updateVariable(variable) {
    console.log(updateVariable);
    console.log(variable);
    var vid = variable.id;
    delete variable.id;
    let v2 = await Homey.logic.updateVariable({ id: vid, variable: variable });
    return v2;
}

async function getVariable(varName) {
    let vars = await Homey.logic.getVariables();
    var hit = Object.values(vars).find(function (element) {
        return element.name == varName;
    });
    return hit;
}

async function updateVariableValue(varName, newValue) {
    // let variable = await getVariable(varName);
    //variable.value = newValue;
    //let testVar2 = await updateVariable(variable);
    //return testVar2;
    await setTagValue(varName, {type:"number", title: varName}, newValue);
}

var maxLevel = 0.90;
var minLevel = 0.01;
var maxTemp = 0.98;
var minTemp = 0.58;
var bigHueReductionFactor = 0.83;
var b = 6.5;
var now = new Date();
var x = now.getHours() + (now.getMinutes() / 60);
var levelAdjustment = await getVariable("AutodimLevel");
var levelAdjustmentPercent = 1 + (levelAdjustment.value / 100);
//console.log(levelAdjustmentPercent);

//Light level
var level = 0.89*Math.sin(((b*Math.PI)/(-(24-b)))+((Math.PI*x)/(24-b)))+0.01;
level = level * levelAdjustmentPercent;
level = Math.round(level*100)/100;

//Light temperature
//var temperature = 1-level;
var temperature = (0.50/2)*Math.cos(((2*Math.PI)/24)*x)+0.70;
temperature = Math.round(temperature*100)/100;

if(level < minLevel){
    level = minLevel;
}
else if(level > maxLevel)
{
    level = maxLevel;
}

if(temperature < minTemp)
{
    temperature = minTemp;
}
else if(temperature > maxTemp)
{
    temperature = maxTemp;
}

var globalHueBrightness = level;
var result = await updateVariableValue("GlobalSmallHueBrightness", globalHueBrightness);
//console.log(result);

var globalBigHueBrightness = Math.round(level*bigHueReductionFactor*100)/100;
if(globalBigHueBrightness < minLevel){
    globalBigHueBrightness = minLevel;
}
result = await updateVariableValue("GlobalBigHueBrightness", globalBigHueBrightness);
//console.log(result);

result = await updateVariableValue("GlobalHueTemperature", temperature);
//console.log(result);


let devices = await Homey.devices.getDevices();

_.forEach(devices, device => {
    //console.log(device);

    //Only relevant for phillips hue bulbs
    if(device.class != 'light') return;
    if(device.driverUri != 'homey:app:com.philips.hue.zigbee') return;
    if(device.settings.transition_time > 2) return;

    //Only adjust bulbs turned on
    if(device.capabilitiesObj.onoff.value == false) return;
    
    //Exclude masterbedroom zone
    if(device.zone == 'ddc3cdaa-8172-4c4a-97c9-22d8ec462972')return;

    var productId = device.settings.zb_product_id;
    if(productId == 'LTW012'){
        device.setCapabilityValue('dim', globalHueBrightness);
        device.setCapabilityValue('light_temperature', temperature);
    }
    else if(productId == 'LTW010'){
        device.setCapabilityValue('dim', globalBigHueBrightness);
        device.setCapabilityValue('light_temperature', temperature);
    }
    else if(productId == 'LWB010')
    {
        device.setCapabilityValue('dim', globalBigHueBrightness);
    }
    
});

return true;


