--
-- Created by IntelliJ IDEA.
-- User: ryanberg
-- Date: 12/4/16
-- Time: 1:45 PM
--

--local cjson = require "cjson"
--local cjson2 = cjson.new()
local cjson_safe = require "cjson.safe"

function parseCatQuery()
    local catQuery = "select * from cat limit 12"

    if (ngx.var.arg_search_type and ngx.var.arg_search_text) then
        catQuery = "select * from cat where ".. ngx.var.arg_search_type .." ilike '%".. ngx.var.arg_search_text .."%' order by price asc limit 12";
    elseif ngx.var.arg_category_name ~= nil then
        catQuery = "select * from cat where category = '".. ngx.var.arg_category_name .."' order by price asc limit 12"
    end

    ngx.var.sort_query = catQuery
end

function boundaryCheck()
    local radius;
    if ngx.var.arg_radius then
        radius = tonumber(ngx.var.arg_radius)

        if radius > 0 and radius <= 10 then
            radius = ngx.var.arg_radius
        elseif radius > 10 then
            radius = 10
        end

    else
        radius = 1;
    end

--  miles to degrees
    radius = radius * .01666666666;

    ngx.var.boundary_query = " where ("..ngx.var.arg_latitude.."<"..ngx.var.arg_latitude+radius.." and "..ngx.var.arg_latitude..">"..ngx.var.arg_latitude-radius..
            ") and ("..ngx.var.arg_longitude..">"..ngx.var.arg_longitude-radius.." and "..ngx.var.arg_longitude.."<"..ngx.var.arg_longitude+radius..")"

end