
#### Read and check for errors ####
#read using readr to prevent errors
#bin price cause shape is categorical
#check that all requirements are fullfilled
# names categories with NA or empty names
# all existing categories
# cnnections and name missing their opposite
options(stringsAsFactors=F)
print(warnings())
options(warn=1)
options(scipen=0)

require(readr)
Ns <- read_delim("Connections.csv", 
                 ";", escape_double = FALSE, trim_ws = TRUE)
Ns$Price[is.na(Ns$Price)] <- 0
Ns$PriceBin<-cut(Ns$Price,breaks=c(0,1,3,70,200,600,99999),include.lowest = T)


View(Ns)
bad.names <- 
  c(which(is.na(Ns$Name)),
    which((Ns$Name %in% c(""," ",NA))))
print(paste("Bad Names - "
            ,Ns$Name[bad.names]))
print("Unique Categories :")
print(unique(Ns$Category))
bad.cat <- 
  c(which(is.na(Ns$Category)),
    which((Ns$Category %in% c(""," ",NA))))
print(paste("Bad Categories - "
            ,Ns$Name[bad.cat]))
#Ns$Category[bad.cat]<-"unk"
Ns$Category[Ns$Category %in% c("person","community")]<-"concept"
Ns$Category[Ns$Category %in% c("app","device","wear")]<-"app-device"
Ns<-Ns[(Ns$Category !="app-device"),]
Ns$Category[Ns$Category %in% c("test","sensor")]<-"sensor-test"

require(stringr)
lower_connections<-c("Manual_Out","Manual_In",
                     "Automatic_Out","Automatic_In","Name","Synonyms")
ilc <- lower_connections[1]
for(ilc in lower_connections) Ns[,ilc]<-(str_to_lower(as.vector(Ns[,ilc,drop=T])))

no.connect <- 
  is.na(Ns$Manual_Out) &
  is.na(Ns$Manual_In) &
  is.na(Ns$Automatic_Out) &
  is.na(Ns$Automatic_In)
no.connect <- which(no.connect)
print("Entries maybe missing connections")
print(Ns$Name[no.connect])   
vec.1 <- c((Ns$Manual_Out),
           (Ns$Manual_In),
           (Ns$Automatic_Out),
           (Ns$Automatic_In))
notsimple <- str_split(vec.1,",",simplify = T)
vecsim <- vector()
for(i in 1:dim(notsimple)[2]){
  vecsim <- c(vecsim,notsimple[,i])
}
no.connect <- no.connect[!(Ns$Name[no.connect] %in% vecsim)]
print("Entries absolutely unconnected to any others !!!! ### synonyms not included right above")
print(Ns$Name[no.connect]) 
vecsim <- unique(vecsim)  
unnamed_connections <- !(vecsim %in% c(Ns$Name,unlist(strsplit(Ns$Synonyms,split=",")),"",NA))
print("Connetions without a name")
print(removeedges <- vecsim[unnamed_connections]) 
Ns <- as.data.frame(Ns)


#### Edges from table ####
#combine auto and manual
#for each item 
# fill edges frame
#for each edge
# all mentions of a synonym made into nym name
#edge frame cleaned
# NA unique duplicate
# connections without a line
Ns$W_Out <- (paste(Ns$Manual_Out,Ns$Automatic_Out,sep=","))
Ns$W_In <- (paste(Ns$Manual_In,Ns$Automatic_In,sep=","))


#Ns$Unq_Out <- str_split(Ns$W_Out,",",simplify = F)
#Ns$Unq_In <- unique(str_split(Ns$W_In,",",simplify = F))

edg <- data.frame()
for (nm in 1:dim(Ns)[1]) {
  #nm<-1
  dumy <- data.frame(indt=Ns$Name[nm],
                     out=str_split(Ns$W_Out[nm],",",simplify = F))
  names(dumy)<-c("in_data","out_data")
  edg <- rbind(edg,dumy)
  dumy <- data.frame(indt=str_split(Ns$W_In[nm],",",simplify = F),
                     out=Ns$Name[nm])
  names(dumy)<-c("in_data","out_data")
  edg <- rbind(edg,dumy)
}
edg <- edg[!(edg$in_data== "NA" | edg$out_data== "NA"),]
nm<-1
for (nm in 1:dim(Ns)[1]) {
  edg$in_data[(edg$in_data %in% Ns$Synonyms[nm])]<-Ns$Name[nm]
  edg$out_data[(edg$out_data %in% Ns$Synonyms[nm])]<-Ns$Name[nm]
}
print("if following differ there were duplicates")
print(dim(edg))
edg <- unique(edg)
print(dim(edg))
View(edg)
edg <- edg[!(edg$in_data %in% removeedges),]
edg <- edg[!(edg$out_data %in% removeedges),]
edg <- edg[!(edg$out_data == edg$in_data),]
#print(warnings())
#### User rating difficulty and simplification ####
#user rates each edges/methods difficulty and how much detail is lost. 
#also weight given to each edge in cse that ever matters.
# Complicated data flow
# Take file user edits to change basic Aggreg, Difficulty, Explanation, and Weight.
# To it add new connections with just default values.
# user can find all th eedges needing rating by looking for 3,3
# Data user made must never be lost even if connection removed.
#edg$Aggregation <- 3
#edg$Difficulty <- 3
#edg$Explanation <- "bc"
#edg$Weit<-edg$Difficulty+edg3Aggregation
#write.csv(edg,file="edgAutoFromConnect.csv",row.names = F)
#load user's inut file; clean
#merge connection's based edge file and user's file keeping all
#fill NAs in merged with defaults
#reorder and select for easier reading 
#save file
edg$ConnectInGraph<-"T"
edg2 <- read_csv("EdgeUInputDifficulty.csv")
print(problems(edg2))
edg2 <- as.data.frame(edg2)
edg2$ConnectInGraph <- NULL
edg2$Weit[-grep("[kw]",edg2$Explanation,fixed=T)] <- NA
#edg2$X<-NULL
edg3 <- merge.data.frame(edg2,edg,all = T, by=c("in_data","out_data"))
print("dimensions of edge frames; from connections, from file, combo")
print(paste(dim(edg),dim(edg2),dim(edg3)))

edg3$ConnectInGraph[is.na(edg3$ConnectInGraph)] <- "F"
edg3$Aggregation[is.na(edg3$Aggregation)] <- 3
edg3$Difficulty[is.na(edg3$Difficulty)] <- 3
edg3$Weit[is.na(edg3$Weit)] <- edg3$Difficulty[is.na(edg3$Weit)] + edg3$Aggregation[is.na(edg3$Weit)]
#edg3$Weit <- edg3$Difficulty + edg3$Aggregation

edg3 <- edg3[order(edg3$in_data,decreasing=T),]
edg3 <- edg3[order(edg3$Explanation,decreasing=T),
             c("in_data","out_data","Aggregation",
               "Difficulty","Weit","ConnectInGraph","Explanation")]
edg3 <- edg3[order(edg3$ConnectInGraph,decreasing=T),]
write.csv(edg3,file="EdgeUInputDifficulty.csv",row.names = F)
#edg3$Explanation[is.na(edg3$Explanation)] <- "bc"

#### declutter then graph ####
#prep for graphing
#add centerdness via igraph
#all leafs to be much closer to nodes
#edges between very centered or high degree nodes 
# to be bigger, for more room
#plot graph
require(netCoin)
names(Ns)[1] <- "name"
names(edg3)[1:2] <- c("Source","Target")
edg3 <- edg3[edg3$ConnectInGraph=="T",]

# keep the clutter away by giving busy nodes large distances
# nodes with only one connection should stick close to their one neighbor
# nodes with many connections to nodes with also many connections 
# should allow those nodes to space out.

require(igraph)
W <- edg3[,c("Source","Target")]
#Net <- netCoin(N,W,dir="KeyWordCoinc")
nod <- unique(union(W$Source,W$Target))
require(stringr)
wind <- function(x)  which(x==nod)
vwind <- Vectorize(wind)
W$n1 <- vwind(W$Source)
W$n2 <- vwind(W$Target)
el <- as.matrix(W[,c("n1","n2")])
g2 <- add_edges(make_empty_graph(length(nod),dir=F), t(el[,1:2]),dir=F) %>%
  set_edge_attr("color", value = "red")
plot(g2)
cent <- data.frame(Degree=degree(g2),
                   Closens=closeness(g2)*10,
                   Betweens=betweenness(g2),
                   Eigenvec=eigen_centrality(g2)$vector,
                   name=nod)
Ns<-merge(Ns,cent)

ReduceWeitByDegree <- function(trgedg,degf,cut=5,cuthigh=1000, sett=.8){
  cts<-(trgedg$Source %in% degf$name[degf$Degree>=cut 
                                     & degf$Degree<=cuthigh] |
          trgedg$Target %in% degf$name[degf$Degree>=cut 
                                       & degf$Degree<=cuthigh])
  trgedg$Weit[cts] <-  sett  
  return(trgedg)
}

freWhich <- Vectorize(function(edg4,Ns){which(edg4==Ns$name)[1]},"edg4")
edg3$SouCent <- Ns$Degree[freWhich(edg3$Source,Ns)]
edg3$TarCent <- Ns$Degree[freWhich(edg3$Target,Ns)]

# 2x2 3x3 much smaller than 2x10 ?
# or at least single joints two neightbors do not need the length that much
# types and groups together so whatomeasureflows into sensor then into aggregator like into center bullseye
# sould unfold easily and no overlap 
#big aggregators like gogleheath must sit right next to Goal(csv file)
#edg3$AdjCent <- (apply(edg3[,c("SouCent","TarCent")],1,max)/4)
edg3$AdjCent <- edg3$SouCent  + edg3$TarCent
edg3$Weit <- sqrt( 10  * (9) / sqrt(edg3$AdjCent) )
#+ edg3$Weit
edg3 <- ReduceWeitByDegree(edg3, Ns, cut=1, cuthigh=1, sett = max(edg3$Weit)+(sd(edg3$Weit))/2)
#edg3 <- ReduceWeitByDegree(edg3, Ns, cut=2, cuthigh=2, sett = max(edg3$Weit))


Net <- netCoin(Ns, edg3, dir = "netCoin_DataFlow_NoDevices",
               size = "Degree", color = "Category", 
               shape = "PriceBin",
               showArrows = T, lcolor = "Difficulty",
               lwidth = "Aggregation", lweight = "Weit",
               ltext = "Explanation")#, degreeFilter = 6)

#print(warnings())

