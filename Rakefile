$: << File.expand_path(File.dirname(__FILE__)) + "/src/ruby"

require 'rake/clean'
require 'yaml'
require 'Coordinator'
require 'Rakelib'
require 'tmpdir'

CONFIG = YAML.load_file(File.join(File.dirname(__FILE__), "Config.yaml"))

desc "Builds all compilation targets specified in Config.yaml"
task :default => [:build_crow]

CLEAN.include("build/js", "dist", "test_runner/public/gen", "test_runner/tmp", "DEADJOE", "tmp", "CrowLib.tgz", "Crow")
CLOBBER.include("build", "test_runner/gems", "test_runner/.bundle")

# HELPERS
def download_file(url, destination)
	sh "wget #{url} -O #{destination}"
end

class String
	def starts_with?(prefix)
	  prefix = prefix.to_s
	  self[0, prefix.length] == prefix
	end
end

class GoogleClosure
	include Singleton
	include Rake::DSL

	ROOT = File.expand_path("build/google_closure")

	LIBRARY_URL = "http://closure-library.googlecode.com/svn/trunk/"
	LIBRARY_ROOT = ROOT + "/library"
	CALC_DEPS_BIN = LIBRARY_ROOT + "/closure/bin/calcdeps.py"

	COMPILER_URL = "http://closure-compiler.googlecode.com/files/compiler-latest.zip"
	COMPILER_ARCHIVE = ROOT + "/compiler.zip"
	COMPILER_ROOT = ROOT + "/compiler"
	COMPILER_JAR = COMPILER_ROOT + "/compiler.jar"

	def checkout_library
		sh "svn checkout #{LIBRARY_URL} #{LIBRARY_ROOT}"
	end

	def download_compiler
		mkdir_p COMPILER_ROOT
		download_file(COMPILER_URL, COMPILER_ARCHIVE) unless File.exist?(COMPILER_ARCHIVE)
		sh "unzip #{COMPILER_ARCHIVE} -d #{COMPILER_ROOT}"
	end

	def compile(files, out, calc_deps_opts={}, flags=nil)
		files = [files] unless files.is_a? Array
		files = files.map {|f| "--input=#{f}"}
		path = [LIBRARY_ROOT]
		#if(CONFIG[:path]) then path += CONFIG[:path] end
		path += calc_deps_opts[:path] if calc_deps_opts[:path]
		path.map! {|d| "--path=#{d}" }
		flags = flags.map {|f| '-f "' + f + '"'}.join(" ") unless flags.nil?
		sh "#{CALC_DEPS_BIN} #{files.join(' ')} #{path.join(' ')} --output_mode=compiled --compiler_jar=#{COMPILER_JAR} #{flags} > #{out}"
	end
	def calculate_dependencies(files, calc_deps_opts={})
		if(!files.is_a? Array)
			files = files.to_a
		end
		files = files.sort.map {|f| "--input=#{f}"}
		path = [LIBRARY_ROOT]
		#if(CONFIG[:path]) then path += CONFIG[:path] end
		path += calc_deps_opts[:path] if calc_deps_opts[:path]
		path.map! {|d| "--path=#{d}" }
		puts "Checking dependencies..."
		command = "#{CALC_DEPS_BIN} #{files.join(' ')} #{path.join(' ')}"
		puts command
		%x[#{command}].split
	end
end

class SourceList
	include Singleton

	attr_accessor :file_list

	def self.get
		SourceList.instance.file_list ||= GoogleClosure.instance.calculate_dependencies(FileList.new(CONFIG[:files]), :path => CONFIG[:path])
	end
end
class TestList
	include Singleton

	attr_accessor :file_list

	def self.get
		TestList.instance.file_list ||= GoogleClosure.instance.calculate_dependencies(FileList.new(CONFIG[:files] + CONFIG[:test_files]), :path => CONFIG[:path])
	end
end

default_name = CONFIG[:base_filename]
debug_filename = "build/js/#{CONFIG[:base_filename]}.debug.js"

OPTIMIZATIONS = {
	:mini => ["--compilation_level=WHITESPACE_ONLY"],
	:micro => ["--compilation_level=SIMPLE_OPTIMIZATIONS"],
	:pico => ["--compilation_level=ADVANCED_OPTIMIZATIONS"],
}

directory "build/js"
directory "dist/js"
directory "dist/docs"
directory "dist/docs_private"

# TASKS
file GoogleClosure::CALC_DEPS_BIN do
	GoogleClosure.instance.checkout_library
end
file GoogleClosure::COMPILER_JAR do
	GoogleClosure.instance.download_compiler
end

class JsDoc
	CHECKOUT_ROOT = "build/jsdoc_toolkit"
	ROOT = CHECKOUT_ROOT + "/jsdoc-toolkit"
	JAR = ROOT + "/jsrun.jar"
	RUN_JS = ROOT + "/app/run.js"
	TEMPLATES = ROOT + "/templates/jsdoc"
end

file JsDoc::JAR do
	URL = "http://jsdoc-toolkit.googlecode.com/svn/trunk/"
	sh "svn checkout #{URL} #{JsDoc::CHECKOUT_ROOT}"
end

task :generate_javascript_docs => ["dist/docs", "dist/docs_private", JsDoc::JAR] do
	files = SourceList.get.to_a
	files.reject! {|f| f.starts_with? "build/"}
	FILES = files.join(' ')
	sh "java -jar #{JsDoc::JAR} #{JsDoc::RUN_JS} -a -t=#{JsDoc::TEMPLATES} #{FILES} -d=dist/docs"
	sh "java -jar #{JsDoc::JAR} #{JsDoc::RUN_JS} -a -t=#{JsDoc::TEMPLATES} --private #{FILES} -d=dist/docs_private"
end

task :prepare_build => [GoogleClosure::CALC_DEPS_BIN] do
	CONFIG[:advanced_compilation].each do |mode, name|
		name_to_use = nil

		if(name.is_a? String)
			name_to_use = "dist/js/#{name}.js"
		elsif(name)
			name_to_use = "dist/js/#{default_name}.#{mode.to_s}.js"
		end

		if(!name_to_use.nil?)
			optimization = OPTIMIZATIONS[mode]
			file name_to_use => [:"dist/js", GoogleClosure::CALC_DEPS_BIN, GoogleClosure::COMPILER_JAR] do
				#GoogleClosure.instance.compile CONFIG[:files], name_to_use, nil, optimization
				perform_build(CONFIG[:files], name_to_use, optimization)
			end
			SourceList.get.each {|f| file name_to_use => f}
			task :real_build => [name_to_use]
		end
	end
end
task :real_build
task :build_crow => [:prepare_build, :real_build]

file debug_filename => ["build/js"] do
	generate_debug(CONFIG[:files], debug_filename)
end
task :prepare_debug => [GoogleClosure::CALC_DEPS_BIN] do
	SourceList.get.each {|f| file debug_filename => f}
end
task :real_debug_build => [debug_filename]
desc "Builds #{debug_filename}, the concatenated (not minified) version of files"
task :debug => [:prepare_debug, :real_debug_build]

namespace "test" do
	test_filename = "build/js/#{default_name}-test.js"
	file test_filename => ["build/js", GoogleClosure::CALC_DEPS_BIN, GoogleClosure::COMPILER_JAR] do
		perform_build(FileList.new(CONFIG[:files] + CONFIG[:test_files]), test_filename, (["--create_source_map=./build/test-map"] + OPTIMIZATIONS[:micro]))
	end
	task :prepare_build do
		TestList.get.each {|f| file test_filename => f}
	end
	task :real_build => [test_filename]
	desc "Builds build/js/#{default_name}-test.js, the default minified test javascript"
	task :build => ["test:prepare_build", "test:real_build"]

	test_debug_filename = "build/js/#{CONFIG[:base_filename]}-test.debug.js"
	file test_debug_filename => ["build/js"] do
		generate_debug(FileList.new(CONFIG[:files] + CONFIG[:test_files]), test_debug_filename)
	end
	task :prepare_debug => [GoogleClosure::CALC_DEPS_BIN] do
		TestList.get.each {|f| file test_debug_filename => f}
	end
	task :real_debug_build => [test_debug_filename]
	desc "Builds #{test_debug_filename}, the unminified debugging test javascript"
	task :debug => ["test:prepare_debug", "test:real_debug_build"]

	task :prepare_test_runner => [:check_bundler] do
		if(!File.exist? "test_runner/gems")
			cd "test_runner" do
				sh "bundle install gems --disable-shared-gems"
			end
		end
	end

	desc "Run the test server on localhost (port will be shown on startup)"
	task :runner => [:prepare_test_runner] do
		cd "test_runner" do
			puts "** Port will show up shortly.  Use Ctrl-C to exit! **"
			ruby "test_runner.rb"
		end
	end
	namespace "runner" do
		desc "Remove the database associated with the test runner"
		task :clean_db do
			raise
			cd "test_runner" do
				rm_rf "*.db"
			end
		end
		desc "Rebuilds docs and symlinks /docs to them"
		task :docs do
			sh "rake docs"
			sh "ln -fst test_runner/public/ ../../dist/docs/"
			sh "ln -fst test_runner/public/ ../../dist/docs_private/"
		end
	end
end

Thread.abort_on_exception = true
DebugCoordinator = Coordinator.new
DebugCoordinator.register_processor DisableClosureDeps.new
DebugCoordinator.register_processor LineCounter.new

def generate_debug(files, filename, markers=true)
	deps = GoogleClosure.instance.calculate_dependencies(files, :path => CONFIG[:path])

	output = StringIO.new
	deps.each do |d|
		File.open(d) do |f|
			DebugCoordinator << ControlCode(:new_file, :filename => d)
			while(line = f.gets)
				DebugCoordinator << line
			end
			DebugCoordinator << ControlCode(:end_file)
		end
	end

	DebugCoordinator.wait_until_done
	DebugCoordinator.results.each {|r| output.puts r}
	File.open(filename, "w") {|f| f.write output.string }
	$stderr.puts("Wrote debug file: #{filename}")
end

def perform_build(files, filename, opts)
	base = File.join(Dir.tmpdir, "crow")
	rm_rf base
	mkdir_p base
	cp_r "src", base
	cp_r "tst", base

	files = files.map {|f| File.expand_path File.join(base, f)}

	def new_coordinator
		c = Coordinator.new
		c.register_processor RemoveDebugHash.new
		c.register_processor RemoveLogStatements.new
		c.register_processor FixJSDocArraysForGoogleClosure.new
		c
	end

	deps = GoogleClosure.instance.calculate_dependencies(files, :path => [base + "/src", base + "/tst"])
	deps = deps.select {|d| d.include? base}
	deps.each_with_index do |d, idx|
		coordinator = new_coordinator
		File.open(d) do |f|
			coordinator << ControlCode(:new_file, :filename => d, :index => idx)
			while(line = f.gets)
				coordinator << line
			end
			coordinator << ControlCode(:end_file)
		end
		coordinator.wait_until_done
		output = StringIO.new
		coordinator.results.each {|r| output.puts r}
		File.open(d, 'w') {|f| f.write output.string }
	end

	filename = File.expand_path(filename)
	calcdeps_opts = {:path => [base]}
	GoogleClosure.instance.compile files, filename, calcdeps_opts, opts
	$stderr.puts("Wrote built file: #{filename}")
end

task :docs => [:generate_javascript_docs]

task :check_bundler do
	if `which bundle` == ""
		raise "Bundler must be installed...http://gembundler.com/"
	end
end

task :archive => [:clean] do
	sh "mkdir -p tmp/Crow"
	sh "cp LICENSE README.md tmp/Crow"
	threads = []
	threads << Thread.new do
		sh "rake docs"
	end
	threads << Thread.new do
		sh "rake"
	end
	threads.each {|t| t.join}
	sh "cp -r dist/* tmp/Crow"
	filename = "CrowLib.tgz"
	cd "tmp" do
		sh "tar -czvf #{filename} Crow"
	end
	sh "mv tmp/#{filename} ."
end
