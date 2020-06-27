#Graph of Quantified Self Health Tracking Ecosystem and Data Flow
#Because the big ML section of internet research is taking too long.
#Table of all info user needs to decide on what app or devices to use.
#And a graph viualisation to let user see all this info easily.

#Data includes lists inside cells. I have chosen commas to seperate items inside those lists and semicolon to seperate the cells. 
#If saveing from a spreadsheet editor make sure the delimiter is a ;. 
#no ; or , inside name or synonym because obv this will split the cell 
#Items added to Connections.csv must include name and category.
#Manual connections, input into Manual_out and in, must be exactly same as name of item. Just copy-paste.
#Connections are not needed if page reader will find this item in a page for another item or 
#this item is already in some connectins column. 
#Url links should be the entire url with http: .
#Synonyms are used by the auto page reader to find strings in linked pages.
#Case and space sensitive. White space matters and is trimmed from ends but not around commas.
#Idealy, when used as search string in engine, Names should bring up only relevant pages. 

#### Read and check for errors ####
#read using readr to prevent errors
#check that all requirements are fullfilled
#If app name missing, or coloring
options(stringsAsFactors=F)
print(warnings())
require(readr)
Cs <- read_delim("Connections.csv", 
                  ";", escape_double = FALSE, trim_ws = TRUE)
Cs$Price[is.na(Cs$Price)]<-0
View(Cs)
bad.names <- 
  c(which(is.na(Cs$Name)),
    which((Cs$Name %in% c(""," ",NA))))
print(paste("Bad Names - "
            ,Cs$Name[bad.names]))
print("Unique Categories :")
print(unique(Cs$Category))
bad.cat <- 
  c(which(is.na(Cs$Category)),
    which((Cs$Category %in% c(""," ",NA))))
print(paste("Bad Categories - "
            ,Cs$Name[bad.cat]))

no.connect <- 
    is.na(Cs$Manual_Out) &
    is.na(Cs$Manual_In) &
    is.na(Cs$Automatic_Out) &
    is.na(Cs$Automatic_In)
no.connect <- which(no.connect)
print("Entries maybe missing connections")
print(Cs$Name[no.connect])   
vec.1 <- c((Cs$Manual_Out),
  (Cs$Manual_In),
  (Cs$Automatic_Out),
  (Cs$Automatic_In))
require(stringr)
notsimple <- str_split(vec.1,",",simplify = T)
vecsim <- vector()
for(i in 1:dim(notsimple)[2]){
  vecsim <- c(vecsim,notsimple[,i])
}
no.connect <- no.connect[!(Cs$Name[no.connect] %in% vecsim)]
print("Entries absolutely unconnected to any others")
print(Cs$Name[no.connect])   
unnamed_connections<-!(unique(vecsim) %in% c(Cs$Name,"",NA))
print("Connetions without a name")
print(Cs$Name[unnamed_connections]) 
Cs<-as.data.frame(Cs)

#### Edges from table ####
Cs$W_Out <- (paste(Cs$Manual_Out,Cs$Automatic_Out,sep=","))
Cs$W_In <- (paste(Cs$Manual_In,Cs$Automatic_In,sep=","))

#Cs$Unq_Out <- str_split(Cs$W_Out,",",simplify = F)
#Cs$Unq_In <- unique(str_split(Cs$W_In,",",simplify = F))

edg <- data.frame()
for (nm in 1:dim(Cs)[1]) {
  #nm<-1
  dumy <- data.frame(indt=Cs$Name[nm],
                     out=str_split(Cs$W_Out[nm],",",simplify = F))
  names(dumy)<-c("in_data","out_data")
  edg <- rbind(edg,dumy)
  dumy <- data.frame(indt=str_split(Cs$W_In[nm],",",simplify = F),
                     out=Cs$Name[nm])
  names(dumy)<-c("in_data","out_data")
  edg <- rbind(edg,dumy)
}
edg <- edg[!(edg$in_data== "NA" | edg$out_data== "NA"),]
print("if following differ there were duplicates")
print(dim(edg))
edg <- unique(edg)
print(dim(edg))
View(edg)
#print(warnings())

#### Make graph ####
require(netCoin)
names(Cs)[1]<-"name"
names(edg)<-c("Source","Target")
edg$ForColor<-1
Net <- netCoin(Cs,edg,dir="netCoin_DataFlow",
               size="degree",color="Category",shape="Price",
               showArrows = T, lcolor = "ForColor"
               )

#print(warnings())
