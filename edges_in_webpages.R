#find connections between items in QS ecosystem 
#by searching thorough web pages

#load file
#reload all data?,
#find unparsed links
#
#for each link 
# load page
# get strings to search for
# search page
# update data
#
#save file
#
#### load file get links ####
require(readr)
Cs <- read_delim("Connections.csv", 
                 ";", escape_double = FALSE, trim_ws = TRUE)
Cs <- as.data.frame(Cs)
lix <- (!is.na(Cs$Link_In) & is.na(Cs$Automatic_In))
lox <- (!is.na(Cs$Link_Out) & is.na(Cs$Automatic_Out))
search_again <- F
if(search_again){
  lix <- (!is.na(Cs$Link_In))
  lox <- (!is.na(Cs$Link_Out))
}

#alsyn<-paste(Cs$Synonyms,sep=",",collapse = ",")
#alsyn<-paste(paste(Cs$Name,collapse=","),alsyn,sep=",")
#alsyn<-unique(alsyn)

#### for each in link####
require(rvest)
require(stringr)

for (l in which(lix)) {
  pagel <- Cs$Link_In[l]
  pge <- html_text(read_html(pagel))
  pge <- str_conv(pge,encoding = "UTF-8")
  foundstrng <- vector()
  for(i in 1:dim(Cs)[1]){ #i<-6
    eachstring <- c(Cs$Name[i],str_split(Cs$Synonyms[i],",")[[1]])
    if(str_detect(pge, eachstring)) foundstrng <- c(foundstrng,Cs$Name[i])
  }
  Cs$Automatic_In[l]<-paste(foundstrng,collapse = ",")
}
#### save ####
write.table(Cs,file="tst.csv",quote = F,sep = ";",na="",row.names = F)
