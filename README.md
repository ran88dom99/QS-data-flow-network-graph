# QS-data-flow-network-graph
# Network Graph of Quantified Self Health Tracking Ecosystem and Data Flow
QS subbredit is filled with questions on what apps and devices to use and, more generaly, where to start.
A table of available apps and their properties can be hard for a human to parse. 
Most apps do not export their data in any form and those that do usualy require some convoluted process.
Network graphs made by the netCoin package can easily vizualise this process and all the data in a table.

# Instructions
Download zip or file and unpack. Get to netCoin_DataFlow directory and open index.html
Arrows point in direction of data flow.
What to do about clutter? Set repulsion to max and distance to mid. Select node of interest and click Egonet or AddNeighbor then filter connection.
Can disable shapes and sizes of nodes in left corner menues.
Accelerometry can be used to measure step count and gait. How to convey that in a graph? 
If a sensor suite detects "steps" then "steps" points to that sensor so if one sense detects another that other points to the first sense. Like funnel.
Manual entry into file always points to file so its a node. Same with XML, API_to_CSV, and Cloud_to_CSV. Auto is the default edge type.
Price shape is how much the app or device costs; 
0, the circle, is not available or not applicable.
1 square is Open Source, 2 diamond is free, 3 uptriangle is premium adds few features, 
4 cross is affordable (about 30$), 5 downtriangle is an investment (about 120 per 2 years),
6 circle is expencive (300). 7 square is redonkulous 1000$. Only for labs really.  
Devices may be open source but their category is selected based on buying price.

# Adding Data
You could post correctly formatted lines to a forum but please learn git instead.
Data includes lists inside cells. I have chosen commas to seperate items inside those lists and semicolon to seperate the cells. 
If saveing from a spreadsheet editor make sure the delimiter is a ;. 
no ; or , inside name or synonym because obv this will split the cell 
Items added to Connections.csv must include name and category.
Manual connections, input into Manual_out and in, must be exactly same as name of item. Just copy-paste.
Connections are not needed if page reader will find this item in a page for another item or 
this item is already in some connectins column. 
Url links should be the entire url with http: .
Synonyms are used by the auto page reader to find strings in linked pages.
Case and space sensitive. White space matters and is trimmed from ends but not around commas.
Idealy, when used as search string in engine, Names should bring up only relevant pages. 
